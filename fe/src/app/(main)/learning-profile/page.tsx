import { redirect } from 'next/navigation';

/** Trang cũ — hồ sơ học tập đã gộp vào trang Hồ sơ. */
export default function LearningProfileRedirect() {
  redirect('/profile');
}
