import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { isLoggedIn } from "./api/client";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BookLibrary from "./pages/BookLibrary";
import BookEditor from "./pages/BookEditor";

function RequireAuth({ children }: { children: JSX.Element }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <BookLibrary />
            </RequireAuth>
          }
        />
        <Route
          path="/books/:bookId"
          element={
            <RequireAuth>
              <BookEditor />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
