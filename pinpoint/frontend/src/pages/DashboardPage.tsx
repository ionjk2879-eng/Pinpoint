import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { fetchSubscriptions, createSubscription, deleteSubscription } from '../api/subscriptions';
import { downloadCsvReport, downloadPdfReport } from '../api/reports';
import { suggestCategory } from '../api/suggestion';
import ChartsSection from '../components/ChartsSection';
import type { Subscription, BillingCycle, UsageType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function DashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [usageType, setUsageType] = useState<UsageType>('BUSINESS');
  const [accountingCategory, setAccountingCategory] = useState('');
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null);
  const [suggestionMatched, setSuggestionMatched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { nickname, logout } = useAuth();
  const navigate = useNavigate();

  const [reportUsageType, setReportUsageType] = useState<UsageType | ''>('BUSINESS');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [chartsRefreshKey, setChartsRefreshKey] = useState(0);

  const load = async () => {
    const data = await fetchSubscriptions();
    setSubscriptions(data);
    setChartsRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    load();
  }, []);

  // 서비스명을 입력하면 0.5초 뒤 사전에서 업무/개인 분류 + 계정과목을 추천받는다.
  useEffect(() => {
    if (!serviceName.trim()) {
      setSuggestionNote(null);
      setSuggestionMatched(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await suggestCategory(serviceName.trim());
        setSuggestionMatched(result.matched);
        setSuggestionNote(result.note);
        if (result.matched) {
          if (result.suggestedUsageType) setUsageType(result.suggestedUsageType);
          setAccountingCategory(result.suggestedAccountingCategory ?? '');
        }
      } catch {
        setSuggestionNote(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [serviceName]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await createSubscription({
        serviceName,
        amount: Number(amount),
        billingCycle,
        usageType,
        accountingCategory: accountingCategory || undefined,
      });
      setServiceName('');
      setAmount('');
      setAccountingCategory('');
      setSuggestionNote(null);
      await load();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '구독 등록에 실패했습니다.'));
    }
  };

  const handleDelete = async (id: number) => {
    setErrorMessage(null);
    try {
      await deleteSubscription(id);
      await load();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '구독 삭제에 실패했습니다.'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setDownloading(format);
    try {
      const params = {
        usageType: reportUsageType || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined,
      };
      if (format === 'csv') {
        await downloadCsvReport(params);
      } else {
        await downloadPdfReport(params);
      }
    } finally {
      setDownloading(null);
    }
  };

  const businessTotal = subscriptions
    .filter((s) => s.usageType === 'BUSINESS')
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{nickname}님의 구독 목록</h1>
        <button onClick={handleLogout}>로그아웃</button>
      </div>

      <p style={{ color: '#555' }}>업무용 구독료 합계 (월 환산 기준): {businessTotal.toLocaleString()}원</p>

      {errorMessage && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
          {errorMessage}
        </p>
      )}

      <ChartsSection key={chartsRefreshKey} />

      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="서비스명 (예: Canva)" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
          <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>
            <option value="MONTHLY">월간</option>
            <option value="YEARLY">연간</option>
          </select>
          <select value={usageType} onChange={(e) => setUsageType(e.target.value as UsageType)}>
            <option value="BUSINESS">업무용</option>
            <option value="PERSONAL">개인용</option>
          </select>
          <input
            placeholder="참고 계정과목 (예: 지급수수료)"
            value={accountingCategory}
            onChange={(e) => setAccountingCategory(e.target.value)}
          />
          <button type="submit">추가</button>
        </div>
        {suggestionNote && (
          <p style={{ fontSize: 13, color: suggestionMatched ? '#2563eb' : '#999', margin: 0 }}>
            {suggestionMatched ? '💡 추천: ' : ''}{suggestionNote}
          </p>
        )}
      </form>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, margin: '20px 0' }}>
        <h3 style={{ marginTop: 0 }}>리포트 다운로드</h3>
        <p style={{ fontSize: 13, color: '#777', marginTop: -8 }}>
          ※ 일반 정보 제공용 리포트입니다. 필요경비 인정 여부는 세무사와 최종 확인하세요.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={reportUsageType} onChange={(e) => setReportUsageType(e.target.value as UsageType | '')}>
            <option value="">전체</option>
            <option value="BUSINESS">업무용만</option>
            <option value="PERSONAL">개인용만</option>
          </select>
          <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
          <span>~</span>
          <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
          <button onClick={() => handleDownload('csv')} disabled={downloading !== null}>
            {downloading === 'csv' ? '생성 중...' : 'CSV 다운로드'}
          </button>
          <button onClick={() => handleDownload('pdf')} disabled={downloading !== null}>
            {downloading === 'pdf' ? '생성 중...' : 'PDF 다운로드'}
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th>서비스</th>
            <th>금액</th>
            <th>주기</th>
            <th>분류</th>
            <th>계정과목</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{s.serviceName}</td>
              <td>{s.amount.toLocaleString()}원</td>
              <td>{s.billingCycle === 'MONTHLY' ? '월간' : '연간'}</td>
              <td>{s.usageType === 'BUSINESS' ? '업무용' : '개인용'}</td>
              <td style={{ color: '#777' }}>{s.accountingCategory ?? '-'}</td>
              <td><button onClick={() => handleDelete(s.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
