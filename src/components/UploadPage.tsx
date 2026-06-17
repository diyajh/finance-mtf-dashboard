import FileUpload from "./FileUpload";

type UploadPageProps = {
  setCurrentPage: (page: string) => void;
};

function UploadPage({ setCurrentPage }: UploadPageProps) {
  return (
    <div className="page">
      <button className="back-button" onClick={() => setCurrentPage("dashboard")}>
        ← Back to Dashboard
      </button>

      <h1>Upload Weekly Report</h1>
      <p className="upload-subtitle">
        Upload weekly MTF data in Excel or CSV format.
      </p>

      <FileUpload />
    </div>
  );
}

export default UploadPage;