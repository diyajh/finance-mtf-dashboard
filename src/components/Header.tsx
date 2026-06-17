function Header() {
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