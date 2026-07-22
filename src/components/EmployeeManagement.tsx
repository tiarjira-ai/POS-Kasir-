import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileText, CheckCircle, RefreshCw, 
  Clock, Plus, ShieldCheck, DollarSign, ArrowUpRight,
  Edit, Trash2, Printer, Download
} from 'lucide-react';
import { Employee, Attendance, Payroll } from '../types';
import { jsPDF } from 'jspdf';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'ABSEN' | 'SHIFT' | 'PAYROLL'>('ROSTER');
  const [storeProfile, setStoreProfile] = useState<any>({ name: 'Warung Daeng Soppeng', address: "Cikke'e, Watansoppeng, Sulawesi Selatan", phone: '085342016403' });

  useEffect(() => {
    const fetchStoreProfile = async () => {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && data.storeProfile) {
            setStoreProfile(data.storeProfile);
          }
        }
      } catch (err) {
        console.error('Error fetching settings in EmployeeManagement:', err);
      }
    };
    fetchStoreProfile();
  }, []);

  // Attendance Simulator State
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'LATE' | 'PERMIT'>('PRESENT');

  // Add Employee State
  const [addModal, setAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'KASIR' as any,
    pin: '123456',
    shift: 'Pagi' as any,
    salary: 1500000,
    phone: '',
    address: '',
  });

  // Edit Employee State
  const [editModal, setEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    role: 'KASIR' as any,
    pin: '',
    shift: 'Pagi' as any,
    salary: 1500000,
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setAttendance(data.attendances || data.attendance || []);
        setPayrolls(data.payrolls || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          pin: formData.pin,
          shift: formData.shift,
          salary: formData.salary,
          phone: formData.phone,
          address: formData.address,
        }),
      });
      if (res.ok) {
        setAddModal(false);
        setFormData({ name: '', role: 'KASIR', pin: '112233', shift: 'Pagi', salary: 1500000, phone: '', address: '' });
        fetchEmployeeData();
      }
    } catch (err) {
      console.error('Error saving employee:', err);
    }
  };

  const triggerClockIn = async () => {
    if (!selectedStaffId) return;
    try {
      const res = await fetch('/api/v1/employees/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedStaffId, status: attStatus }),
      });
      if (res.ok) {
        alert('Kehadiran (Absensi) berhasil dicatat dalam log sistem!');
        fetchEmployeeData();
      }
    } catch (err) {
      console.error('Error posting clock attendance:', err);
    }
  };

  const paySalary = async (employeeId: string) => {
    const staff = employees.find(e => e.id === employeeId);
    if (!staff) return;

    if (staff.payrollStatus === 'PAID') {
      const pRecord = payrolls.find(p => p.employeeId === employeeId);
      generatePayslipPDF(staff, pRecord);
      return;
    }

    const salaryVal = staff.salary ?? staff.baseSalary ?? 1500000;
    if (!confirm(`Konfirmasi pembayaran gaji tunai untuk ${staff.name} senilai Rp ${salaryVal.toLocaleString('id-ID')}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/employees/pay/${employeeId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const resData = await res.json();
        alert(`Slip gaji ${staff.name} dilunasi! Pengeluaran operasional terupdate.`);
        
        const updatedPayroll = resData.payroll;
        const updatedStaff = { ...staff, payrollStatus: 'PAID' };
        
        generatePayslipPDF(updatedStaff, updatedPayroll);
        fetchEmployeeData();
      } else {
        alert('Gagal membayar gaji karyawan');
      }
    } catch (err) {
      console.error('Error paying salary:', err);
    }
  };

  const handleEditClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEditFormData({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      pin: emp.pin,
      shift: (emp as any).shift || 'Pagi',
      salary: emp.salary ?? (emp as any).baseSalary ?? 1500000,
      phone: emp.phone || '',
      address: emp.address || '',
    });
    setEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/employees/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          role: editFormData.role,
          pin: editFormData.pin,
          shift: editFormData.shift,
          salary: editFormData.salary,
          phone: editFormData.phone,
          address: editFormData.address,
        }),
      });
      if (res.ok) {
        setEditModal(false);
        fetchEmployeeData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Gagal mengubah data karyawan');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan karyawan ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/employees/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert(`Karyawan ${name} berhasil dinonaktifkan!`);
        fetchEmployeeData();
      } else {
        alert('Gagal menonaktifkan karyawan');
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
    }
  };

  const generatePayslipPDF = (emp: any, pRecord: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Slate header banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    // Title / POS Logo
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(storeProfile.name.toUpperCase(), 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${storeProfile.address} | Telp: ${storeProfile.phone}`, 15, 23);
    doc.text('Sistem POS & Manajemen Operasional Digital', 15, 28);
    doc.text('SLIP GAJI RESMI KARYAWAN', 15, 33);

    // Body Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('Rincian Pembayaran Gaji', 15, 52);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 55, 195, 55);

    // Employee Details Section
    doc.setFontSize(10);
    doc.text('INFORMASI PENERIMA:', 15, 63);

    doc.setFont('Helvetica', 'normal');
    doc.text('Nama Karyawan:', 15, 71);
    doc.setFont('Helvetica', 'bold');
    doc.text(emp.name, 48, 71);

    doc.setFont('Helvetica', 'normal');
    doc.text('Jabatan / Role:', 15, 77);
    doc.setFont('Helvetica', 'bold');
    doc.text(emp.role, 48, 77);

    doc.setFont('Helvetica', 'normal');
    doc.text('No. Handphone:', 15, 83);
    doc.setFont('Helvetica', 'bold');
    doc.text(emp.phone || '-', 48, 83);

    doc.setFont('Helvetica', 'normal');
    doc.text('Alamat:', 15, 89);
    doc.setFont('Helvetica', 'bold');
    doc.text(emp.address || '-', 48, 89);

    // Period Details (Right Column)
    doc.setFont('Helvetica', 'normal');
    doc.text('Bulan Periode:', 115, 71);
    doc.setFont('Helvetica', 'bold');
    doc.text(pRecord?.month || new Date().toISOString().substring(0, 7), 145, 71);

    doc.setFont('Helvetica', 'normal');
    doc.text('Metode Bayar:', 115, 77);
    doc.setFont('Helvetica', 'bold');
    doc.text('Tunai (Dikasir)', 145, 77);

    doc.setFont('Helvetica', 'normal');
    doc.text('Status Gaji:', 115, 83);
    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
    doc.text('LUNAS / PAID', 145, 83);
    doc.setTextColor(15, 23, 42); // reset

    doc.line(15, 94, 195, 94);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 100, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.text('Deskripsi / Komponen Gaji', 18, 105);
    doc.text('Pendapatan', 120, 105);
    doc.text('Potongan', 160, 105);

    // Data Rows
    doc.setFont('Helvetica', 'normal');
    doc.text('Gaji Pokok Karyawan', 18, 115);
    doc.text(`Rp ${Number(pRecord?.baseSalary || emp.salary || 1500000).toLocaleString('id-ID')}`, 120, 115);
    doc.text('Rp 0', 160, 115);

    doc.text('Uang Makan & Tunjangan Shift', 18, 123);
    doc.text(`Rp ${Number(pRecord?.bonus || 150000).toLocaleString('id-ID')}`, 120, 123);
    doc.text('Rp 0', 160, 123);

    doc.text('Potongan Lainnya', 18, 131);
    doc.text('Rp 0', 120, 131);
    doc.text(`Rp ${Number(pRecord?.deductions || 0).toLocaleString('id-ID')}`, 160, 131);

    doc.line(15, 136, 195, 136);

    // Net pay summary box
    doc.setFillColor(236, 253, 245);
    doc.rect(15, 141, 180, 12, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(6, 95, 70); // deep green
    doc.text('TOTAL GAJI BERSIH (NET PAID):', 18, 148);
    doc.setFontSize(11);
    const nett = (pRecord?.totalPaid || (Number(emp.salary || 1500000) + 150000));
    doc.text(`Rp ${nett.toLocaleString('id-ID')}`, 120, 148);

    doc.setTextColor(15, 23, 42); // restore color

    // Notes
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('* Pembayaran gaji ini sah diproses secara digital dan telah ditandatangani oleh pihak manajemen.', 15, 162);

    // Signatures
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text('Diterima Oleh (Karyawan),', 30, 180);
    doc.text('Disetujui Oleh (Owner),', 135, 180);

    doc.setFont('Helvetica', 'bold');
    doc.text(emp.name, 30, 205);
    doc.text('Daeng Baji', 135, 205);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak melalui Daeng Smart POS: ${new Date().toLocaleString('id-ID')}`, 15, 220);

    doc.save(`Slip_Gaji_${emp.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generatePayrollReportPDF = (employeesList: any[], payrollsList: any[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(storeProfile.name.toUpperCase(), 15, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${storeProfile.address} | Telp: ${storeProfile.phone}`, 15, 22);
    doc.text('Sistem POS & Manajemen Operasional Outlet Terpadu', 15, 27);
    doc.text('LAPORAN PERTANGGUNGJAWABAN GAJI KARYAWAN', 15, 32);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    doc.text(`LAPORAN REKAPITULASI PAYROLL & OPERASIONAL`, 15, 48);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Periode Laporan: ${currentMonthName} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 15, 53);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 56, 195, 56);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 62, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nama Karyawan', 18, 67);
    doc.text('Jabatan', 55, 67);
    doc.text('Gaji Pokok', 85, 67);
    doc.text('Bonus', 115, 67);
    doc.text('Total Gaji', 145, 67);
    doc.text('Status', 175, 67);

    let y = 76;
    let totalBase = 0;
    let totalBonus = 0;
    let totalNett = 0;

    employeesList.forEach((emp) => {
      if (emp.status === 'INACTIVE') return;
      const isPaid = emp.payrollStatus === 'PAID';
      const baseVal = emp.salary ?? emp.baseSalary ?? 1500000;
      const bonusVal = isPaid ? 150000 : 0;
      const nettVal = baseVal + bonusVal;

      totalBase += baseVal;
      totalBonus += bonusVal;
      totalNett += nettVal;

      doc.setFont('Helvetica', 'normal');
      doc.text(String(emp.name), 18, y);
      doc.text(String(emp.role), 55, y);
      doc.text(`Rp ${baseVal.toLocaleString('id-ID')}`, 85, y);
      doc.text(`Rp ${bonusVal.toLocaleString('id-ID')}`, 115, y);
      doc.text(`Rp ${nettVal.toLocaleString('id-ID')}`, 145, y);
      
      if (isPaid) {
        doc.setTextColor(16, 185, 129);
        doc.setFont('Helvetica', 'bold');
        doc.text('LUNAS', 175, y);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.setFont('Helvetica', 'bold');
        doc.text('TERTUNDA', 175, y);
      }
      doc.setTextColor(15, 23, 42);
      
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 2, 195, y + 2);
      y += 9;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    y += 2;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 180, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 28);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RINGKASAN PERTANGGUNGJAWABAN PAYROLL:', 18, y + 6);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Gaji Pokok Terbayar: Rp ${totalBase.toLocaleString('id-ID')}`, 18, y + 13);
    doc.text(`Total Bonus & Tunjangan: Rp ${totalBonus.toLocaleString('id-ID')}`, 18, y + 19);
    
    doc.setFont('Helvetica', 'bold');
    doc.text(`TOTAL PENGELUARAN NETT BULAN INI: Rp ${totalNett.toLocaleString('id-ID')}`, 18, y + 25);

    y += 38;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('Helvetica', 'normal');
    doc.text('Dibuat & Disetujui Oleh,', 145, y);
    doc.text('Manajer Keuangan / Kasir,', 30, y);

    doc.setFont('Helvetica', 'bold');
    doc.text('Junaedi Kasir', 30, y + 25);
    doc.text('Daeng Baji (Owner)', 145, y + 25);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Laporan Pertanggungjawaban ini dibuat sah melalui Daeng Smart POS ${new Date().toLocaleString('id-ID')}`, 15, y + 35);

    doc.save(`LPJ_Payroll_Gaji_${new Date().toISOString().substring(0, 7)}.pdf`);
  };

  const activeEmployees = employees.filter(e => e.status !== 'INACTIVE');

  return (
    <div className="space-y-4">
      
      {/* Tab select toolbar */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { code: 'ROSTER', label: 'Roster Karyawan', icon: Users },
            { code: 'ABSEN', label: 'Absensi Simulator', icon: Clock },
            { code: 'SHIFT', label: 'Jadwal Kerja', icon: Calendar },
            { code: 'PAYROLL', label: 'Slip Gaji', icon: FileText }
          ] as const).map((tab) => (
            <button
              key={tab.code}
              onClick={() => setActiveTab(tab.code)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.code 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-black' 
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 shrink-0">
          {activeTab === 'ROSTER' && (
            <button
              onClick={() => setAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Staff</span>
            </button>
          )}
          <button 
            onClick={fetchEmployeeData} 
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Board Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="bg-[#0F172A]/70 backdrop-blur-md rounded-3xl shadow-xl border border-slate-800/60 overflow-hidden p-6">
          
          {/* TAB 1: EMPLOYEES ROSTER */}
          {activeTab === 'ROSTER' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Daftar Roster & Hak Akses Karyawan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-800">
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">Posisi / Role</th>
                      <th className="p-3">Jadwal Shift</th>
                      <th className="p-3">No. HP & Alamat</th>
                      <th className="p-3">Gaji Pokok / Bulan</th>
                      <th className="p-3 text-center">Metode Login PIN</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                    {activeEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-extrabold border border-slate-700/40">
                            {emp.name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block">{emp.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {emp.id}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-medium">{(emp as any).shift || 'Pagi'} Shift</td>
                        <td className="p-3 text-slate-400 font-medium">
                          <div className="font-bold text-slate-300">{emp.phone || '-'}</div>
                          <div className="text-[10px] text-slate-500 max-w-[150px] truncate">{emp.address || '-'}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">Rp {(emp.salary ?? (emp as any).baseSalary ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 text-center text-slate-500 font-mono">PIN: ****** ({emp.pin})</td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 p-2 rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(emp.id, emp.name)}
                            className="bg-slate-800 hover:bg-red-500 hover:text-slate-950 text-red-400 p-2 rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                            title="Nonaktifkan Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE CLOCK SIMULATOR */}
          {activeTab === 'ABSEN' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Form clocker (Left) */}
              <div className="space-y-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-200">Mesin Absensi / Clock-In Simulator</h3>
                <p className="text-xs text-slate-400">Simulasikan kehadiran pagi / sore untuk pencatatan slip gaji bulanan</p>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pilih Karyawan</label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="" className="bg-[#0F172A] text-slate-400">-- Pilih Staff --</option>
                      {activeEmployees.map(e => <option key={e.id} value={e.id} className="bg-[#0F172A]">{e.name} ({e.role})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status Kehadiran</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { code: 'PRESENT', label: 'Tepat Waktu' },
                        { code: 'LATE', label: 'Terlambat' },
                        { code: 'PERMIT', label: 'Sakit / Izin' }
                      ] as const).map(s => (
                        <button
                          type="button"
                          key={s.code}
                          onClick={() => setAttStatus(s.code)}
                          className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            attStatus === s.code 
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                              : 'bg-[#1E293B] border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={triggerClockIn}
                    disabled={!selectedStaffId}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 py-3.5 rounded-2xl text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
                  >
                    <CheckCircle className="w-4.5 h-4.5" />
                    <span>ABSEN SEKARANG (CLOCK IN)</span>
                  </button>
                </div>
              </div>

              {/* Attendance Log (Right) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200">Log Kehadiran Masuk Hari Ini</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(attendance || []).map((att) => {
                    const empName = employees.find(e => e.id === att.employeeId)?.name || 'Karyawan';
                    return (
                      <div key={att.id} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-extrabold text-slate-200 block">{empName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{new Date(att.date).toLocaleDateString('id-ID')} {att.clockIn}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          att.status === 'PRESENT' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                            : att.status === 'LATE' 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {att.status === 'PRESENT' ? 'Tepat Waktu' : att.status === 'LATE' ? 'Terlambat' : 'Izin'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SHIFT WORK SCHEDULER */}
          {activeTab === 'SHIFT' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Jadwal Shift Harian Karyawan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pagi Shift */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
                  <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded uppercase block mb-3 w-max">
                    SHIFT PAGI (08:00 - 15:00)
                  </span>
                  <div className="space-y-2">
                    {activeEmployees.filter(e => ((e as any).shift || 'Pagi') === 'Pagi').map(e => (
                      <div key={e.id} className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl text-xs font-semibold text-slate-300 flex justify-between items-center">
                        <span className="font-bold text-slate-100">{e.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-extrabold">{e.role}</span>
                      </div>
                    ))}
                    {activeEmployees.filter(e => ((e as any).shift || 'Pagi') === 'Pagi').length === 0 && (
                      <p className="text-xs text-slate-500 italic">Tidak ada staff</p>
                    )}
                  </div>
                </div>

                {/* Sore Shift */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
                  <span className="text-[10px] font-extrabold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded uppercase block mb-3 w-max">
                    SHIFT SORE (15:00 - 22:00)
                  </span>
                  <div className="space-y-2">
                    {activeEmployees.filter(e => (e as any).shift === 'Sore').map(e => (
                      <div key={e.id} className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl text-xs font-semibold text-slate-300 flex justify-between items-center">
                        <span className="font-bold text-slate-100">{e.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-extrabold">{e.role}</span>
                      </div>
                    ))}
                    {activeEmployees.filter(e => (e as any).shift === 'Sore').length === 0 && (
                      <p className="text-xs text-slate-500 italic">Tidak ada staff</p>
                    )}
                  </div>
                </div>

                {/* Full Day Shift */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
                  <span className="text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded uppercase block mb-3 w-max">
                    SHIFT FULL DAY (08:00 - 22:00)
                  </span>
                  <div className="space-y-2">
                    {activeEmployees.filter(e => (e as any).shift === 'Full_Day').map(e => (
                      <div key={e.id} className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl text-xs font-semibold text-slate-300 flex justify-between items-center">
                        <span className="font-bold text-slate-100">{e.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-extrabold">{e.role}</span>
                      </div>
                    ))}
                    {activeEmployees.filter(e => (e as any).shift === 'Full_Day').length === 0 && (
                      <p className="text-xs text-slate-500 italic">Tidak ada staff</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYROLL SLIP MANAGER */}
          {activeTab === 'PAYROLL' && (
            <div className="space-y-4">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Gaji Pokok & Slip Upah Karyawan</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Kelola pembayaran gaji bulanan karyawan dan unduh laporan pertanggungjawaban operasional.</p>
                </div>
                <button
                  onClick={() => generatePayrollReportPDF(activeEmployees, payrolls)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh LPJ Gaji (PDF)</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-800">
                      <th className="p-3">Nama Karyawan</th>
                      <th className="p-3">Gaji Pokok Bulanan</th>
                      <th className="p-3">Uang Makan / Bonus</th>
                      <th className="p-3">Status Pembayaran</th>
                      <th className="p-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                    {activeEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-black border border-slate-700/40">
                            {emp.name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block">{emp.name}</span>
                            <span className="text-[10px] text-slate-500">{emp.role}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-200">Rp {(emp.salary ?? (emp as any).baseSalary ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 font-mono text-emerald-400">
                          {emp.payrollStatus === 'PAID' ? '+Rp 150.000 (Lunas)' : '+Rp 150.000 (Selesai Pagi)'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            emp.payrollStatus === 'PAID' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {emp.payrollStatus === 'PAID' ? 'LUNAS (DIBAYAR)' : 'TERTUNDA'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => paySalary(emp.id)}
                            className={`font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                              emp.payrollStatus === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950'
                                : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            {emp.payrollStatus === 'PAID' ? (
                              <>
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak Slip</span>
                              </>
                            ) : (
                              <span>Bayar Gaji / Slip</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: Add Employee Form */}
      {addModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAddSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-100 mb-4 font-sans">Tambah Karyawan Baru</h3>

            <div className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jabatan / Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="KASIR" className="bg-[#0F172A]">Kasir</option>
                    <option value="DAPUR" className="bg-[#0F172A]">Dapur / Kitchen</option>
                    <option value="GUDANG" className="bg-[#0F172A]">Gudang / Stockist</option>
                    <option value="MANAGER" className="bg-[#0F172A]">Manager</option>
                    <option value="OWNER" className="bg-[#0F172A]">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jadwal Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Pagi" className="bg-[#0F172A]">Pagi</option>
                    <option value="Sore" className="bg-[#0F172A]">Sore</option>
                    <option value="Full_Day" className="bg-[#0F172A]">Full Day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">No. Handphone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812xxxx"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PIN Login (6 digit)</label>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                    placeholder="123456"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-center tracking-widest font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gaji Pokok (Rp)</label>
                <input 
                  type="number" 
                  required
                  value={formData.salary || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: Number(e.target.value) }))}
                  placeholder="1500000"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Tempat Tinggal</label>
                <textarea 
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Nama jalan, nomor rumah, kecamatan..."
                  rows={2}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-semibold resize-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/85 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAddModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer transition-colors"
              >
                Simpan Staff
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Employee Form */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleEditSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-100 mb-4 font-sans">Ubah Data Staff</h3>

            <div className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jabatan / Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="KASIR" className="bg-[#0F172A]">Kasir</option>
                    <option value="DAPUR" className="bg-[#0F172A]">Dapur / Kitchen</option>
                    <option value="GUDANG" className="bg-[#0F172A]">Gudang / Stockist</option>
                    <option value="MANAGER" className="bg-[#0F172A]">Manager</option>
                    <option value="OWNER" className="bg-[#0F172A]">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jadwal Shift</label>
                  <select
                    value={editFormData.shift}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, shift: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Pagi" className="bg-[#0F172A]">Pagi</option>
                    <option value="Sore" className="bg-[#0F172A]">Sore</option>
                    <option value="Full_Day" className="bg-[#0F172A]">Full Day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">No. Handphone</label>
                  <input 
                    type="text" 
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812xxxx"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PIN Login (6 digit)</label>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={editFormData.pin || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, pin: e.target.value }))}
                    placeholder="123456"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-center tracking-widest font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gaji Pokok (Rp)</label>
                <input 
                  type="number" 
                  required
                  value={editFormData.salary || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, salary: Number(e.target.value) }))}
                  placeholder="1500000"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Tempat Tinggal</label>
                <textarea 
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Nama jalan, nomor rumah, kecamatan..."
                  rows={2}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-semibold resize-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/85 flex gap-2">
              <button 
                type="button" 
                onClick={() => setEditModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer transition-colors"
              >
                Ubah Staff
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
