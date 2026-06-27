import { X } from 'lucide-react';

export function LoanForm({ onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      bankName: data.bankName,
      originalLoanAmount: Number(data.originalLoanAmount),
      remainingBalance: Number(data.remainingBalance),
      interestRate: Number(data.interestRate),
      monthlyPayment: Number(data.monthlyPayment),
      remainingTermMonths: Number(data.remainingTermMonths),
      dueDate: data.dueDate,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="modal wide" role="dialog" aria-modal="true" aria-label="Thêm khoản vay" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Thêm khoản vay</h2>
          <button className="icon-button" onClick={onCancel} aria-label="Đóng"><X size={18} /></button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-body form-grid">
          <label>Ngân hàng<input name="bankName" required placeholder="Ngân hàng A" /></label>
          <label>Số tiền vay ban đầu<input name="originalLoanAmount" required type="number" min="0" placeholder="50000000" /></label>
          <label>Dư nợ gốc hiện tại<input name="remainingBalance" required type="number" min="0" placeholder="32500000" /></label>
          <label>Lãi suất<input name="interestRate" required type="number" step="0.01" min="0" placeholder="5.25" /></label>
          <label>Trả mỗi tháng<input name="monthlyPayment" required type="number" min="0" placeholder="680000" /></label>
          <label>Kỳ hạn còn lại (tháng)<input name="remainingTermMonths" required type="number" min="0" placeholder="36" /></label>
          <label>Ngày đến hạn tiếp theo<input name="dueDate" required type="date" /></label>
          <label>Ngày bắt đầu<input name="startDate" required type="date" /></label>
          <label>Ngày kết thúc<input name="endDate" required type="date" /></label>
          <label>Trạng thái
            <select name="status" defaultValue="Active">
              <option value="Active">Đang hoạt động</option>
              <option value="Closing">Sắp tất toán</option>
              <option value="Paid">Đã trả</option>
            </select>
          </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>Hủy</button>
            <button type="submit" className="primary-button">Lưu</button>
          </div>
        </form>
      </section>
    </div>
  );
}
