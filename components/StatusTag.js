import { STATUS_LABEL } from '@/lib/format';

export default function StatusTag({ status }) {
  return <span className={`tag tag-${status}`}>{STATUS_LABEL[status] || status}</span>;
}
