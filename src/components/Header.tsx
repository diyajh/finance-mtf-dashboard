type HeaderProps = {
  setCurrentPage: (page: string) => void;
};

export default function Header({ setCurrentPage }: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "26px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
          }}
          onClick={() => setCurrentPage("dashboard")}
        >
          <img
            src="/wealthstreet-logo.png"
            alt="Wealthstreet"
            style={{
              height: "64px",
              width: "auto",
              objectFit: "contain",
            }}
          />

          <h1
            style={{
              margin: 0,
              color: "#243B8A",
              fontSize: "2rem",
              fontWeight: 700,
            }}
          >
            MTF Insights
          </h1>
        </div>

        <span
          style={{ cursor: "pointer", fontWeight: 600, color: "#243B8A" }}
          onClick={() => setCurrentPage("upload")}
        >
          Add Data
        </span>

        <span
          style={{ cursor: "pointer", fontWeight: 600, color: "#243B8A" }}
          onClick={() => setCurrentPage("upload-history")}
        >
          Upload History
        </span>
      </div>
    </header>
  );
}