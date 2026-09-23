// ============================================================
// SYNAPSE-LAB — Hàm định dạng dùng chung
// ============================================================

/** "Nguyễn Văn An" -> "NA", "an@gmail.com" -> "AN" */
export function getInitials(nameOrEmail: string): string {
  const words = nameOrEmail.replace(/@.*/, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Tên để chào: lấy tên riêng (từ cuối) theo cách gọi của người Việt. */
export function getGreetingName(name: string, email: string): string {
  const clean = name.trim();
  if (!clean) return email.split('@')[0];
  const words = clean.split(/\s+/);
  return words[words.length - 1];
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}
