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

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Home />} />
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
