import { useState } from 'react';

const ADMIN_EMAIL_INBOX = 'dreamcanvasacademy@gmail.com';
const WHATSAPP_NUMBER = '8801319233580'; // no leading + for the wa.me URL

export default function PaymentRequestForm({ courseTitle, onBack }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    paymentNumber: '',
    transactionId: '',
    amount: '',
  });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildMessage() {
    return [
      `Access code request — ${courseTitle}`,
      '',
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone}`,
      `Course: ${courseTitle}`,
      `Payment mobile number: ${form.paymentNumber}`,
      `Transaction ID: ${form.transactionId}`,
      `Amount paid: ${form.amount}`,
    ].join('\n');
  }

  function validate() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return false;
    }
    if (!form.paymentNumber.trim() || !form.transactionId.trim() || !form.amount.trim()) {
      setError('Please fill in the payment number, transaction ID, and amount paid.');
      return false;
    }
    setError('');
    return true;
  }

  function handleSendEmail() {
    if (!validate()) return;
    const subject = encodeURIComponent(`DeshiEdu access request — ${courseTitle}`);
    const body = encodeURIComponent(buildMessage());
    
    // mailto: এর বদলে সরাসরি Gmail ওয়েব কম্পোজ লিংক
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${ADMIN_EMAIL_INBOX}&su=${subject}&body=${body}`, '_blank');
  }

  function handleWhatsApp() {
    if (!validate()) return;
    const text = encodeURIComponent(buildMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener');
  }

  return (
    <div className="payment-request-form">
      <p className="empty-state">
        Paid for <strong>{courseTitle}</strong>? Fill this in and send it — we'll verify and reply
        with your access code.
      </p>
      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input value={form.name} onChange={(e) => update('name', e.target.value)} />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
      </label>
      <label>
        Phone Number
        <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
      </label>
      <label>
        Selected Course
        <input value={courseTitle} disabled />
      </label>
      <label>
        Payment Mobile Number (bKash/Nagad/etc.)
        <input value={form.paymentNumber} onChange={(e) => update('paymentNumber', e.target.value)} />
      </label>
      <label>
        Transaction ID
        <input value={form.transactionId} onChange={(e) => update('transactionId', e.target.value)} />
      </label>
      <label>
        Amount Paid
        <input value={form.amount} onChange={(e) => update('amount', e.target.value)} />
      </label>

      <div className="payment-actions">
        <button type="button" className="send-btn" onClick={handleSendEmail}>
          ✉️ Send Request by Email
        </button>
        <button type="button" className="whatsapp-btn" onClick={handleWhatsApp}>
          💬 Send via WhatsApp
        </button>
      </div>
      <button type="button" className="request-access-link" onClick={onBack}>
        ← Back to access code
      </button>
    </div>
  );
}