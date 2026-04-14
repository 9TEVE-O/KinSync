export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>KinSync</h1>
      <p>Your family, in sync.</p>
      <p>
        <a href="/auth/login">Sign in</a>
      </p>
    </main>
  );
}
