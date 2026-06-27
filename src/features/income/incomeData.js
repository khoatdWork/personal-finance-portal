const today = new Date().toISOString().slice(0, 10);

export const incomeCategories = [
  { id: 'cat-salary', name: 'Lương', type: 'fixed', icon: 'Briefcase', color: '#0066cc', description: 'Lương công ty', active: true },
  { id: 'cat-allowance', name: 'Trợ cấp', type: 'fixed', icon: 'Wallet', color: '#34c759', description: 'Trợ cấp hàng tháng', active: true },
  { id: 'cat-rental', name: 'Cho thuê', type: 'fixed', icon: 'Home', color: '#ff9500', description: 'Thu nhập cho thuê', active: true },
  { id: 'cat-passive', name: 'Thu nhập thụ động', type: 'fixed', icon: 'Repeat', color: '#af52de', description: 'Thu nhập thụ động hàng tháng', active: true },
  { id: 'cat-freelance', name: 'Làm tự do', type: 'variable', icon: 'Laptop', color: '#5856d6', description: 'Dự án khách hàng', active: true },
  { id: 'cat-driving', name: 'Chạy xe', type: 'variable', icon: 'Car', color: '#5ac8fa', description: 'Thu nhập chạy xe', active: true },
  { id: 'cat-commission', name: 'Hoa hồng', type: 'variable', icon: 'BadgePercent', color: '#ff2d55', description: 'Thu nhập hoa hồng', active: true },
  { id: 'cat-bonus', name: 'Thưởng', type: 'variable', icon: 'Gift', color: '#ffcc00', description: 'Tiền thưởng', active: true },
  { id: 'cat-investment', name: 'Đầu tư', type: 'variable', icon: 'TrendingUp', color: '#30d158', description: 'Lợi nhuận đầu tư', active: true },
  { id: 'cat-other', name: 'Khác', type: 'variable', icon: 'CircleDollarSign', color: '#8e8e93', description: 'Thu nhập khác', active: true },
  { id: 'cat-asset-sale', name: 'Bán tài sản', type: 'one-time', icon: 'Landmark', color: '#bf5af2', description: 'Tiền bán tài sản', active: true },
  { id: 'cat-refund', name: 'Hoàn tiền', type: 'one-time', icon: 'Undo2', color: '#64d2ff', description: 'Hoàn tiền và bồi hoàn', active: true },
  { id: 'cat-gift', name: 'Quà tặng', type: 'one-time', icon: 'Gift', color: '#ff375f', description: 'Tiền được tặng', active: true },
  { id: 'cat-misc', name: 'Linh tinh', type: 'one-time', icon: 'Sparkles', color: '#98989d', description: 'Thu nhập một lần khác', active: true },
];

export const incomeSources = [
];

export const incomeTransactions = [
];

export function generateRecurringTransactions(sources, transactions, throughDate = today) {
  const existing = new Set(transactions.map((item) => item.id));
  const generated = [];

  sources
    .filter((source) => source.recurring && source.status === 'active')
    .forEach((source) => {
      const cursor = new Date(`${source.startDate.slice(0, 7)}-01T00:00:00`);
      const end = new Date(`${(source.endDate || throughDate).slice(0, 7)}-01T00:00:00`);

      while (cursor <= end) {
        const yyyyMm = cursor.toISOString().slice(0, 7);
        const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const day = String(Math.min(Number(source.recurringDay), lastDay)).padStart(2, '0');
        const transactionDate = `${yyyyMm}-${day}`;
        const id = `${source.id}-${yyyyMm}`;

        if (transactionDate <= throughDate && !existing.has(id)) {
          generated.push({
            id,
            sourceId: source.id,
            name: source.name,
            type: 'fixed',
            categoryId: source.categoryId,
            amount: source.defaultAmount,
            transactionDate,
            time: '',
            note: source.description,
            attachment: '',
            createdAt: `${transactionDate}T00:00:00.000Z`,
            updatedAt: `${transactionDate}T00:00:00.000Z`,
          });
        }

        cursor.setMonth(cursor.getMonth() + 1);
      }
    });

  return [...transactions, ...generated].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function categoryName(categories, id) {
  return categories.find((category) => category.id === id)?.name ?? 'Chưa phân loại';
}

export function sumBy(rows, predicate = () => true) {
  return rows.filter(predicate).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function monthKey(date) {
  return date.slice(0, 7);
}

export function sameWeek(date, now = new Date()) {
  const value = new Date(`${date}T00:00:00`);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return value >= start && value <= end;
}

export function makeCsv(rows) {
  const headers = ['Ngày', 'Giờ', 'Tên khoản thu', 'Loại', 'Danh mục', 'Số tiền', 'Ghi chú', 'Ngày tạo', 'Ngày cập nhật'];
  const lines = rows.map((row) => [
    row.transactionDate,
    row.time,
    row.name,
    row.type,
    row.category,
    row.amount,
    row.note,
    row.createdAt,
    row.updatedAt,
  ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));

  return [headers.join(','), ...lines].join('\n');
}
