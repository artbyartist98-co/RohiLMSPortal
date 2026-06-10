import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import SafeResponsiveContainer from './SafeResponsiveContainer';
import { EnrolmentRecord } from '../types';
import { Calendar, CheckCircle, DollarSign, Activity, Sparkles, AlertCircle } from 'lucide-react';

interface AdminChartsProps {
  records: EnrolmentRecord[];
}

export default function AdminCharts({ records }: AdminChartsProps) {
  // 1. Enrollment Trends (group by date)
  const trendsData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    // Support sorting dates
    const sorted = [...records].sort((a, b) => {
      return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
    });

    sorted.forEach((r) => {
      try {
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }) : 'Other';
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (err) {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });

    return Object.keys(counts).map((date) => ({
      date,
      Registrations: counts[date]
    }));
  }, [records]);

  // 2. Status Distribution (Pending vs Verified)
  const statusData = useMemo(() => {
    let pending = 0;
    let verified = 0;

    records.forEach((r) => {
      if (r.status === 'Verified') {
        verified++;
      } else {
        pending++;
      }
    });

    return [
      { name: 'Verified Ledger', value: verified, color: '#10b981' },
      { name: 'Pending Verification', value: pending, color: '#f59e0b' }
    ].filter(item => item.value > 0 || records.length === 0);
  }, [records]);

  // If both are 0, add empty mock to show something clean
  const statusDataDisplay = statusData.length === 0 
    ? [{ name: 'No Data', value: 1, color: '#e5e7eb' }]
    : statusData;

  // 3. Fee Collection Overview (Revenue by status & payment plan)
  const feeOverviewData = useMemo(() => {
    let collectedFull = 0;
    let collectedInstallment = 0;
    let pendingFull = 0;
    let pendingInstallment = 0;

    records.forEach((r) => {
      const isInstallment = r.paymentPlan === 'Installment';
      const paid = r.paidAmount !== undefined ? r.paidAmount : (r.status === 'Enrolled' || r.status === 'Verified' ? r.totalFee : 0);
      const pending = Math.max(0, r.totalFee - paid);

      if (isInstallment) {
        collectedInstallment += paid;
        pendingInstallment += pending;
      } else {
        collectedFull += paid;
        pendingFull += pending;
      }
    });

    return [
      {
        name: 'Full Plan',
        Collected: collectedFull,
        Pending: pendingFull
      },
      {
        name: 'Installments',
        Collected: collectedInstallment,
        Pending: pendingInstallment
      }
    ];
  }, [records]);

  // Extra indicators: Total potential revenue, verified collected, pending collection
  const counters = useMemo(() => {
    let potential = 0;
    let collected = 0;
    let pending = 0;

    records.forEach((r) => {
      potential += r.totalFee;
      const paid = r.paidAmount !== undefined ? r.paidAmount : (r.status === 'Enrolled' || r.status === 'Verified' ? r.totalFee : 0);
      collected += paid;
      pending += Math.max(0, r.totalFee - paid);
    });

    return { potential, collected, pending };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Hub Header */}
      <div className="bg-gradient-to-r from-[#004173] to-[#2491bf] p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-sky-300 animate-pulse" />
            <h4 className="text-base font-bold tracking-tight">Real-Time Performance Analytics Desk</h4>
          </div>
          <p className="text-xs text-sky-100/90 mt-1 max-w-xl">
            Live insights on enrolment milestones, fee deposits, ledger verification statistics, and seasonal acquisition trends.
          </p>
        </div>
        <div className="flex gap-4 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xs font-mono text-[10px]">
          <div>
            <span className="text-sky-200 block">LEDGER EFFICIENCY</span>
            <span className="text-sm font-bold block">
              {records.length > 0 
                ? `${Math.round((records.filter(r => r.status === 'Verified').length / records.length) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="border-l border-white/20 pl-3">
            <span className="text-sky-200 block">TOTAL REVENUE</span>
            <span className="text-sm font-bold block text-emerald-300">
              {counters.potential.toLocaleString()} PKR
            </span>
          </div>
        </div>
      </div>

      {/* Extra Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Actual Collected Fee (Paid)</span>
            <span className="text-lg font-bold text-emerald-950 block mt-0.5">{counters.collected.toLocaleString()} PKR</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Outstanding Fee Receivables (Pending)</span>
            <span className="text-lg font-bold text-amber-950 block mt-0.5">{counters.pending.toLocaleString()} PKR</span>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-sky-600 text-white rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-sky-800 font-bold uppercase tracking-wider block">Average Deal Value</span>
            <span className="text-lg font-bold text-sky-950 block mt-0.5">
              {records.length > 0 
                ? `${Math.round(counters.potential / records.length).toLocaleString()}` 
                : '0'}{' '}
              PKR
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#004173]" />
              <span>Sign-up Frequency Trend</span>
            </h5>
            <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded">
              A4 Verified Stream
            </span>
          </div>

          <div className="h-[260px] w-full">
            {trendsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-semibold">
                No chronological records detected.
              </div>
            ) : (
              <SafeResponsiveContainer height={260}>
                {(width, height) => (
                  <LineChart width={width} height={height} data={trendsData} margin={{ top: 20, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Line 
                      type="monotone" 
                      dataKey="Registrations" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }} 
                      activeDot={{ r: 6 }} 
                      label={{ fill: '#047857', fontSize: 10, fontWeight: 'bold', position: 'top' }}
                    />
                  </LineChart>
                )}
              </SafeResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status pie distribution */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Payment Ledger Distribution</span>
            </h5>
          </div>

          <div className="h-[200px] w-full relative flex items-center justify-center">
            <SafeResponsiveContainer height={200}>
              {(width, height) => (
                <PieChart width={width} height={height}>
                  <Pie
                    data={statusDataDisplay}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDataDisplay.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </SafeResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Pool</span>
              <span className="text-lg font-bold text-[#004173] leading-none">{records.length}</span>
            </div>
          </div>

          {/* Color Indicators Ledger */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600 pt-2 border-t border-gray-50 bg-gray-50/50 p-2 rounded-lg">
            {statusDataDisplay.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full block flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
                {item.value !== undefined && <span className="text-gray-400 ml-auto">({item.value})</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Fee overview Bar chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Revenue stream comparison: Collected vs Pending (PKR)</span>
            </h5>
          </div>

          <div className="h-[220px] w-full">
            <SafeResponsiveContainer height={220}>
              {(width, height) => (
                <BarChart width={width} height={height} data={feeOverviewData} margin={{ top: 20, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                  <Legend iconSize={10} fontSize={11} wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: '#047857', fontWeight: 'bold' }} />
                  <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: '#b45309', fontWeight: 'bold' }} />
                </BarChart>
              )}
            </SafeResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
