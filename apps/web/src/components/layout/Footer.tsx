const PRIVACY_URL = 'https://quixotic-cacao-ecd.notion.site/pLAWcess-360786213f238051bfc5f7b21c3a27f6';
const TERMS_URL = 'https://quixotic-cacao-ecd.notion.site/pLAWcess-360786213f23808487a8da5880f48227';

export default function Footer() {
  return (
    <footer className="text-xs text-text-secondary border-t border-border bg-white shrink-0">
      <div className="max-w-5xl mx-auto px-6 py-5 space-y-1 text-center">
        <p>
          <span className="font-semibold text-text-primary">pLAWcess</span>
          {' '}| Copyright © pLAWcess ALL rights Reserved
        </p>
        <p>Creators: 임태경 오지훈 송인보 한승주 김하연</p>
        <div className="flex items-center justify-center gap-4 pt-1">
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary underline-offset-2 hover:underline transition-colors"
          >
            개인정보처리방침
          </a>
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary underline-offset-2 hover:underline transition-colors"
          >
            이용약관
          </a>
          <a
            href="mailto:kusisedu@gmail.com"
            className="hover:text-text-primary underline-offset-2 hover:underline transition-colors"
          >
            문의하기
          </a>
        </div>
      </div>
    </footer>
  );
}
