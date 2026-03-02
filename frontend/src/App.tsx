import React, { useState } from "react";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string>("");
  const [key, setKey] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Выберите файл");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://localhost:8000/files/", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();
      setUploadMsg(JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setUploadMsg("Ошибка загрузки");
    }
  };

  const handleGetUrl = async () => {
    if (!key) return alert("Введите ключ файла");

    try {
      const resp = await fetch(`http://localhost:8000/files/${key}`);
      const data = await resp.json();

      // presigned URL сохраняем для preview
      const url = data.presigned_url || data.msg;
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      setImageUrl("");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Test S3 Endpoints</h1>

      <div>
        <h2>Upload file</h2>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload</button>
        <p>Response: {uploadMsg}</p>
      </div>

      <hr />

      <div>
        <h2>Get presigned URL & preview</h2>
        <input
          type="text"
          placeholder="File key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button onClick={handleGetUrl}>Show Image</button>

        {imageUrl && (
          <div style={{ marginTop: 20 }}>
            <p>Preview:</p>
            <img src={imageUrl} alt="preview" style={{ maxWidth: "500px" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;