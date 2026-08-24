import { apiFetch } from "./client";

export interface Book {
  id: string;
  title: string;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookVersion {
  id: string;
  book_id: string;
  parent_version_id: string | null;
  label: string | null;
  page_count: number | null;
  size_bytes: number;
  created_by: string;
  created_at: string;
}

export function listBooks() {
  return apiFetch<Book[]>("/books");
}

export function getBook(bookId: string) {
  return apiFetch<Book>(`/books/${bookId}`);
}

export function deleteBook(bookId: string) {
  return apiFetch<void>(`/books/${bookId}`, { method: "DELETE" });
}

export async function uploadBook(title: string, file: File): Promise<Book> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<Book>(`/books?title=${encodeURIComponent(title)}`, {
    method: "POST",
    body: form,
    isFormData: true,
  });
}

export function listVersions(bookId: string) {
  return apiFetch<BookVersion[]>(`/books/${bookId}/versions`);
}

export function getVersionHtml(bookId: string, versionId: string) {
  return apiFetch<string>(`/books/${bookId}/versions/${versionId}`);
}

export function saveVersion(bookId: string, html: string, label?: string, parentVersionId?: string) {
  return apiFetch<BookVersion>(`/books/${bookId}/versions`, {
    method: "POST",
    body: { html, label, parent_version_id: parentVersionId },
  });
}

export function revertToVersion(bookId: string, versionId: string) {
  return apiFetch<BookVersion>(`/books/${bookId}/versions/${versionId}/revert`, { method: "POST" });
}

export function exportUrl(bookId: string, format: "html" | "pdf", versionId?: string) {
  const params = new URLSearchParams({ format });
  if (versionId) params.set("version_id", versionId);
  return `/api/books/${bookId}/export?${params.toString()}`;
}
