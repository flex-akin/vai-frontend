import { Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import Loader from "../components/ui/Loader";
import Home from "../pages/Home";
import RootLayout from "../layout/RootLayout";
import Watch from "../pages/watch";
import Popup from "../pages/popup";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="watch" element={<Watch />} />
        <Route path="popup" element={<Popup />} />
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
