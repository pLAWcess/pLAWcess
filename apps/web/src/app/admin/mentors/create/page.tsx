import type { Metadata } from 'next';
import AdminMentorCreateClient from './AdminMentorCreateClient';

export const metadata: Metadata = {
  title: 'pLAWcess | 멘토 계정 생성',
};

export default function AdminMentorCreatePage() {
  return <AdminMentorCreateClient />;
}
