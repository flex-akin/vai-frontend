import { Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import Loader from "../components/ui/Loader";
import Home from "../pages/Home";
import UnderConstruction from "../pages/UnderConstruction";
import RootLayout from "../layout/RootLayout";
import Watch from "../pages/watch";
import Popup from "../pages/popup";
import WatchLayout from "../layout/WatchLayout";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import AdminFeedback from "../pages/AdminFeedback";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<RootLayout />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="popup" element={<Popup />} />
        <Route path="series" element={<UnderConstruction pageName="Series" />} />
        <Route path="movies" element={<UnderConstruction pageName="Movies" />} />
        <Route path="list" element={<UnderConstruction pageName="My List" />} />
      </Route>
      <Route
        path="/admin/feedback"
        element={
          <AdminRoute>
            <AdminFeedback />
          </AdminRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/watch" element={<WatchLayout />}>
        <Route index element={<Watch />} />
        <Route path=":videoId" element={<Watch />} />
      </Route>
    </>
  )
);

const AppRoute = () => {
  return (
    <Suspense fallback={<Loader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};
export default AppRoute;
