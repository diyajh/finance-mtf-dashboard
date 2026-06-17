import { useState } from "react";

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      setUploaded(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploaded(false);
  };

  const handleUpload = () => {
    setUploaded(true);
  };

  return (
    <div className="upload-box">
      <div className="upload-icon">⇩</div>

      <h2>
        {selectedFile ? selectedFile.name : "Drop files or click to upload"}
      </h2>

      <p>Supported formats: .xlsx, .xls, .csv</p>

      {!selectedFile && (
        <label className="browse-button">
          Browse File
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleFileChange}
          />
        </label>
      )}

      {selectedFile && (
        <>
          <p style={{ marginTop: "16px", fontWeight: 600 }}>
            Selected file: {selectedFile.name}
          </p>

          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel Upload
            </button>

            <button className="upload-btn" onClick={handleUpload}>
              Add Data For Analysis
            </button>
          </div>
        </>
      )}

      {uploaded && (
        <p style={{ marginTop: "18px", color: "#16a34a", fontWeight: 700 }}>
          ✓ Data uploaded successfully
        </p>
      )}
    </div>
  );
}

export default FileUpload;