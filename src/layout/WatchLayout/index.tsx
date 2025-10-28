import { Outlet } from "react-router-dom";
import Navbar from "../../components/nav/navbar";

const RootLayout = () => {
  return (
    <div className="flex h-screen">
     
      <div className="flex-1">
         <Navbar
        onSearch={(q) => console.log("search:", q)}
        onSignIn={() => console.log("sign in")}
        onSignOut={() => console.log("sign out")}
        user={{ name: "Ada Lovelace" }}
      />
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
