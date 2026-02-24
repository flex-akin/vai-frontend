import { Outlet } from "react-router-dom";
// import { SideBar } from "../../components";

const RootLayout = () => {
  return (
    <div className="flex h-screen">
      {/* <SideBar /> */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
