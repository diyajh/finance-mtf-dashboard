import { supabase } from "../lib/supabase";

function TestSupabase() {
  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("stocks")
        .insert([
          {
            symbol: "TEST_" + Date.now(),
            company_name: "Test Company",
            sector: "Testing",
          },
        ])
        .select();

      console.log("DATA:", data);
      console.log("ERROR:", error);

      if (error) {
        alert("Error: " + error.message);
        console.error(error);
      } else {
        alert("Supabase connected successfully!");
        console.log(data);
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred");
    }
  };

  return (
    <button
      onClick={testConnection}
      style={{
        padding: "10px 20px",
        background: "#2b4c9a",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        margin: "20px 0",
      }}
    >
      Test Supabase
    </button>
  );
}

export default TestSupabase;