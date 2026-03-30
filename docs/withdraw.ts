// ================================================================
// pLAWcess — 회원 탈퇴 처리 로직 예시
// ================================================================
// 위치: src/lib/user/withdraw.ts
// 사용: DELETE /api/auth/withdraw 또는 관리자 비활성화 시 호출
// ================================================================

import { prisma } from '@/lib/prisma'

export async function withdrawUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { user_id: userId },
    data: {
      // Soft Delete 플래그
      is_deleted: true,
      deleted_at: new Date(),

      // 개인 식별 정보 익명화
      name:       '탈퇴한 사용자',
      phone:      null,
      student_id: null,
      birth_year: null,
      gender:     null,

      // email은 unique 제약 유지를 위해 더미값으로 대체
      // (원래 이메일로 재가입 차단하려면 별도 블랙리스트 테이블 고려)
      email: `deleted_${userId}@removed.com`,

      // 계정 비활성화
      account_status: 'inactive',
    },
  })

  // ※ mentee_records / mentor_records / applications 등 신청 데이터는
  //    매칭 이력 보존을 위해 삭제하지 않음.
  //    개인 식별 정보는 users 테이블에서만 관리하므로
  //    users 익명화만으로 사실상 식별 불가 상태가 됨.
}
