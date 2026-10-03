interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function PayCompletePage({ searchParams }: Props) {
  const { status } = await searchParams;
  const ok = status !== 'cancelled';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F6F7',
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: ok ? '#E1F5EE' : '#F1F3F4',
            color: ok ? '#0F6E56' : '#5F7480',
            fontSize: 28,
          }}
        >
          {ok ? '✓' : '—'}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#12303A', margin: 0 }}>
          {ok ? 'Payment received' : 'Payment cancelled'}
        </h1>
        <p style={{ marginTop: 8, color: '#5F7480', fontSize: 15, lineHeight: 1.5 }}>
          {ok
            ? 'Thanks — your payment has gone through. You can close this window and return to the Builders Ready app; your invoice will update to Paid.'
            : 'No payment was taken. You can close this window and return to the Builders Ready app to try again.'}
        </p>
      </div>
    </div>
  );
}
