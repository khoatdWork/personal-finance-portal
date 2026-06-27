import { X } from 'lucide-react';

export function SavingGoalForm({ onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      goalName: data.goalName,
      targetAmount: Number(data.targetAmount),
      currentAmount: Number(data.currentAmount),
      monthlyContribution: Number(data.monthlyContribution),
      targetDate: data.targetDate,
      status: data.status,
    });
  }

  return (
    <Modal title="Thêm mục tiêu tiết kiệm" onCancel={onCancel}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
        <label>Tên mục tiêu<input name="goalName" required placeholder="Quỹ học tập" /></label>
        <label>Số tiền mục tiêu<input name="targetAmount" required type="number" min="0" placeholder="25000000" /></label>
        <label>Số tiền hiện có<input name="currentAmount" required type="number" min="0" placeholder="3500000" /></label>
        <label>Góp mỗi tháng<input name="monthlyContribution" required type="number" min="0" placeholder="750000" /></label>
        <label>Ngày mục tiêu<input name="targetDate" required type="date" /></label>
        <label>Trạng thái
          <select name="status" defaultValue="Active">
            <option value="Active">Đang hoạt động</option>
            <option value="Paused">Tạm dừng</option>
            <option value="Completed">Hoàn tất</option>
          </select>
        </label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </Modal>
  );
}

function Modal({ title, children, onCancel }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onCancel} aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FormActions({ onCancel }) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>Hủy</button>
      <button type="submit" className="primary-button">Lưu</button>
    </div>
  );
}
