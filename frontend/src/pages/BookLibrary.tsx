import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Book, deleteBook, listBooks, uploadBook } from "../api/books";
import { logout } from "../api/auth";

export default function BookLibrary() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function refresh() {
    try {
      setBooks(await listBooks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const title = window.prompt("Book title", file.name.replace(/\.html?$/i, ""));
    if (!title) return;
    setUploading(true);
    setError(null);
    try {
      const book = await uploadBook(title, file);
      navigate(`/books/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(book: Book) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteBook(book.id);
      refresh();
    } catch (err) {
      // Without this, a failed delete (e.g. the backend's S3 credentials
      // expiring mid-session) fails completely silently — the book stays
      // in the list with no indication anything went wrong.
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>मेरी किताबें</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn primary" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "+ Upload chapter HTML"}
          </button>
          <button className="btn" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
        </div>
        <input ref={fileInput} type="file" accept=".html" hidden onChange={onFileChosen} />
      </header>

      {error && <p className="error-text">{error}</p>}

      {books === null && <p style={{ color: "var(--ink-500)" }}>Loading…</p>}
      {books !== null && books.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--ink-500)", padding: 48 }}>
          अभी तक कोई किताब अपलोड नहीं हुई। शुरू करने के लिए ऊपर "Upload chapter HTML" दबाएं —
          पहले से जनरेट की गई chapter-NN.packaged.html फ़ाइल चुनें।
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {books?.map((book) => (
          <div key={book.id} className="card" style={{ cursor: "pointer" }} onClick={() => navigate(`/books/${book.id}`)}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14.5 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
              Updated {new Date(book.updated_at).toLocaleString()}
            </div>
            <button
              className="btn danger"
              style={{ marginTop: 12, background: "transparent", padding: "4px 0" }}
              onClick={(e) => { e.stopPropagation(); onDelete(book); }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
