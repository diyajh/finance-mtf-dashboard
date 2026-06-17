type HeaderProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setCurrentPage: (page: string) => void;
};

function Header({
  searchTerm,
  setSearchTerm,
  setCurrentPage,
}: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <h1>MTF Insights</h1>

        <button
          onClick={() => setCurrentPage("upload")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            backgroundColor: "white",
            color: "#2563eb",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add Data
        </button>
      </div>

      <input
        type="text"
        placeholder="Search stock..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          borderRadius: "8px",
          border: "1px solid #999",
        }}
      />
    </div>
  );
}

export default Header;