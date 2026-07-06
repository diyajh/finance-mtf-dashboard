type HeaderProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setCurrentPage: (page: string) => void;
};

export default function Header({
  searchTerm,
  setSearchTerm,
  setCurrentPage,
}: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "28px",
        }}
      >
        <h1
          style={{
            margin: 0,
            cursor: "pointer",
            color: "#243B8A",
            fontSize: "3rem",
            fontWeight: 700,
          }}
          onClick={() => setCurrentPage("dashboard")}
        >
          MTF Insights
        </h1>

        <span
          style={{
            cursor: "pointer",
            fontWeight: 600,
            color: "#243B8A",
          }}
          onClick={() => setCurrentPage("dashboard")}
        >
          Dashboard
        </span>

        <span
          style={{
            cursor: "pointer",
            fontWeight: 600,
            color: "#243B8A",
          }}
          onClick={() => setCurrentPage("upload")}
        >
          Add Data
        </span>

        <span
          style={{
            cursor: "pointer",
            fontWeight: 600,
            color: "#243B8A",
          }}
          onClick={() => setCurrentPage("upload-history")}
        >
          Upload History
        </span>
      </div>

      <input
        type="text"
        placeholder="Search stock..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "280px",
          height: "44px",
          padding: "0 16px",
          borderRadius: "10px",
          border: "1px solid #d5dbe6",
          fontSize: "15px",
        }}
      />
    </header>
  );
}