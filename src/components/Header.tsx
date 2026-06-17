type HeaderProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

function Header(props: HeaderProps) {
  const { searchTerm, setSearchTerm } = props;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1>MTF Insights</h1>
  
        <input
          type="text"
          placeholder="Search stock..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
          padding: "10px",
          width: "250px",
          borderRadius: "8px",
        }}
      />
      </div>
    );
  }
  
  export default Header;