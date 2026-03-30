import asyncio
import logging
import os

import discord
from discord import app_commands
from discord.ext import tasks
from dotenv import load_dotenv
from github import Github

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DISCORD_TOKEN = os.environ["DISCORD_TOKEN"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
GITHUB_REPO = os.environ["GITHUB_REPO"]
ISSUE_LOG_CHANNEL_ID = int(os.environ["ISSUE_LOG_CHANNEL_ID"])
ISSUE_REACTION_EMOJI = os.getenv("ISSUE_REACTION_EMOJI", "📋")
REQUIRED_ROLE = os.getenv("REQUIRED_ROLE", "Team")

intents = discord.Intents.default()
intents.message_content = True
intents.reactions = True

bot = discord.Client(intents=intents)
tree = app_commands.CommandTree(bot)
gh = Github(GITHUB_TOKEN)
repo = gh.get_repo(GITHUB_REPO)

# 라벨/collaborator 캐시
label_cache: list[str] = []
collaborator_cache: list[str] = []


@tasks.loop(minutes=10)
async def refresh_cache():
    """GitHub 라벨 및 collaborator 목록을 캐시에 갱신."""
    global label_cache, collaborator_cache
    try:
        label_cache = await asyncio.to_thread(lambda: [l.name for l in repo.get_labels()])
        collaborator_cache = await asyncio.to_thread(lambda: [c.login for c in repo.get_collaborators()])
        logger.info(f"Cache refreshed: {len(label_cache)} labels, {len(collaborator_cache)} collaborators")
    except Exception as e:
        logger.error(f"Failed to refresh cache: {e}")


_synced = False


@bot.event
async def on_ready():
    global _synced
    if not refresh_cache.is_running():
        refresh_cache.start()
    if not _synced:
        await tree.sync()
        _synced = True
    logger.info(f"Logged in as {bot.user}")


async def create_github_issue(
    title: str,
    body: str = "",
    labels: list[str] | None = None,
    assignee: str | None = None,
) -> tuple[bool, str, str]:
    """GitHub 이슈를 생성하고 (성공여부, 이슈URL, 에러메시지)를 반환."""
    try:
        kwargs = {"title": title, "body": body}
        if labels:
            valid_labels = [l for l in labels if l in label_cache]
            if valid_labels:
                kwargs["labels"] = valid_labels
        if assignee and assignee in collaborator_cache:
            kwargs["assignee"] = assignee
        issue = await asyncio.to_thread(repo.create_issue, **kwargs)
        return True, issue.html_url, ""
    except Exception as e:
        return False, "", str(e)


def build_issue_embed(
    title: str,
    url: str,
    author: discord.User,
    method: str,
    labels: list[str] | None = None,
    assignee: str | None = None,
) -> discord.Embed:
    """이슈 생성 확인용 임베드 메시지를 생성."""
    embed = discord.Embed(
        title=f"✅ 이슈 등록: {title}",
        url=url,
        color=discord.Color.green(),
    )
    embed.add_field(name="생성 방식", value=method, inline=True)
    embed.add_field(name="생성자", value=author.display_name, inline=True)
    if labels:
        embed.add_field(name="라벨", value=", ".join(labels), inline=True)
    if assignee:
        embed.add_field(name="담당자", value=assignee, inline=True)
    embed.timestamp = discord.utils.utcnow()
    return embed


async def send_log(embed: discord.Embed):
    """이슈 로그 채널에 임베드 메시지를 전송."""
    channel = bot.get_channel(ISSUE_LOG_CHANNEL_ID)
    if channel:
        await channel.send(embed=embed)
    else:
        logger.warning(f"Issue log channel {ISSUE_LOG_CHANNEL_ID} not found")


def has_required_role(member: discord.Member) -> bool:
    """사용자가 이슈 등록에 필요한 역할을 가지고 있는지 확인."""
    if not REQUIRED_ROLE:
        return True
    return any(role.name == REQUIRED_ROLE for role in member.roles)


class IssueModal(discord.ui.Modal, title="이슈 등록"):
    """2단계: 제목/본문 입력 Modal. 라벨/담당자는 1단계 드롭다운에서 미리 선택됨."""

    issue_title = discord.ui.TextInput(
        label="제목",
        placeholder="이슈 제목을 입력하세요",
        required=True,
        max_length=256,
    )
    issue_body = discord.ui.TextInput(
        label="본문",
        style=discord.TextStyle.long,
        placeholder="이슈 내용을 입력하세요 (선택)",
        required=False,
        max_length=4000,
    )

    def __init__(
        self,
        prefill_title: str = "",
        prefill_body: str = "",
        source_message: discord.Message | None = None,
        method: str = "버튼",
        selected_labels: list[str] | None = None,
        selected_assignee: str | None = None,
    ):
        super().__init__()
        self.source_message = source_message
        self.method = method
        self.selected_labels = selected_labels
        self.selected_assignee = selected_assignee
        if prefill_title:
            self.issue_title.default = prefill_title[:256]
        if prefill_body:
            self.issue_body.default = prefill_body[:4000]

    async def on_submit(self, interaction: discord.Interaction):
        success, url, error = await create_github_issue(
            title=self.issue_title.value,
            body=self.issue_body.value or "",
            labels=self.selected_labels,
            assignee=self.selected_assignee,
        )

        if success:
            embed = build_issue_embed(
                title=self.issue_title.value,
                url=url,
                author=interaction.user,
                method=self.method,
                labels=self.selected_labels,
                assignee=self.selected_assignee,
            )
            if self.source_message:
                await interaction.response.send_message("✅ 이슈가 등록되었습니다.", ephemeral=True)
                await self.source_message.reply(embed=embed)
            else:
                await interaction.response.send_message(embed=embed)
            await send_log(embed)
        else:
            await interaction.response.send_message(
                f"❌ 이슈 생성 실패: {error}", ephemeral=True
            )


class IssueSelectorView(discord.ui.View):
    """1단계: 라벨/담당자 드롭다운 선택 → 다음 버튼 → Modal 열기."""

    def __init__(
        self,
        source_message: discord.Message | None = None,
        method: str = "버튼",
        prefill_title: str = "",
        prefill_body: str = "",
    ):
        super().__init__(timeout=120)
        self.source_message = source_message
        self.method = method
        self.prefill_title = prefill_title
        self.prefill_body = prefill_body
        self.selected_labels: list[str] = []
        self.selected_assignee: str | None = None

        # 라벨 드롭다운 (캐시에서 동적 생성)
        label_select = discord.ui.Select(
            placeholder="라벨 선택 (선택사항)",
            min_values=0,
            max_values=min(len(label_cache), 25) if label_cache else 1,
            options=[
                discord.SelectOption(label=name, value=name)
                for name in label_cache[:25]
            ] if label_cache else [discord.SelectOption(label="(라벨 없음)", value="_none")],
            custom_id="label_select",
        )
        label_select.callback = self.on_label_select
        self.add_item(label_select)

        # 담당자 드롭다운
        assignee_select = discord.ui.Select(
            placeholder="담당자 선택 (선택사항)",
            min_values=0,
            max_values=1,
            options=[
                discord.SelectOption(label=name, value=name)
                for name in collaborator_cache[:25]
            ] if collaborator_cache else [discord.SelectOption(label="(담당자 없음)", value="_none")],
            custom_id="assignee_select",
        )
        assignee_select.callback = self.on_assignee_select
        self.add_item(assignee_select)

    async def on_label_select(self, interaction: discord.Interaction):
        self.selected_labels = [v for v in interaction.data["values"] if v != "_none"]
        await interaction.response.defer()

    async def on_assignee_select(self, interaction: discord.Interaction):
        values = [v for v in interaction.data["values"] if v != "_none"]
        self.selected_assignee = values[0] if values else None
        await interaction.response.defer()

    @discord.ui.button(label="다음 →", style=discord.ButtonStyle.primary, row=2)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        modal = IssueModal(
            prefill_title=self.prefill_title,
            prefill_body=self.prefill_body,
            source_message=self.source_message,
            method=self.method,
            selected_labels=self.selected_labels or None,
            selected_assignee=self.selected_assignee,
        )
        await interaction.response.send_modal(modal)
        self.stop()


@tree.command(name="이슈등록", description="GitHub 이슈를 등록합니다")
async def create_issue_command(interaction: discord.Interaction):
    view = IssueSelectorView(method="슬래시 커맨드")
    await interaction.response.send_message(
        "📋 라벨과 담당자를 선택한 후 **다음 →** 을 눌러주세요.",
        view=view,
        ephemeral=True,
    )


@tree.context_menu(name="이슈 등록")
async def create_issue_from_message(
    interaction: discord.Interaction, message: discord.Message
):
    content = message.content or "(내용 없음)"
    first_line = content.split("\n")[0]
    prefill_title = first_line[:50]

    jump_url = message.jump_url
    prefill_body = f"{content}\n\n---\n[Discord 원본 메시지]({jump_url})"

    view = IssueSelectorView(
        source_message=message,
        method="우클릭 메뉴",
        prefill_title=prefill_title,
        prefill_body=prefill_body,
    )
    await interaction.response.send_message(
        "📋 라벨과 담당자를 선택한 후 **다음 →** 을 눌러주세요.",
        view=view,
        ephemeral=True,
    )


@bot.event
async def on_raw_reaction_add(payload: discord.RawReactionActionEvent):
    if str(payload.emoji) != ISSUE_REACTION_EMOJI:
        return
    if payload.user_id == bot.user.id:
        return

    channel = bot.get_channel(payload.channel_id)
    if not channel:
        return

    message = await channel.fetch_message(payload.message_id)

    # 중복 방지: 봇의 ✅ 리액션이 이미 있으면 스킵
    for reaction in message.reactions:
        if str(reaction.emoji) == "✅" and reaction.me:
            return

    # 역할 확인
    guild = bot.get_guild(payload.guild_id)
    if not guild:
        return
    try:
        member = guild.get_member(payload.user_id) or await guild.fetch_member(payload.user_id)
    except discord.NotFound:
        return
    content = message.content or "(내용 없음)"
    first_line = content.split("\n")[0]
    title = first_line[:50]
    body = f"{content}\n\n---\n[Discord 원본 메시지]({message.jump_url})"

    success, url, error = await create_github_issue(title=title, body=body)

    if success:
        embed = build_issue_embed(
            title=title,
            url=url,
            author=member,
            method="이모지 리액션",
        )
        await message.reply(embed=embed)
        await message.add_reaction("✅")
        await send_log(embed)
    else:
        await message.reply(f"❌ 이슈 생성 실패: {error}")


bot.run(DISCORD_TOKEN)
