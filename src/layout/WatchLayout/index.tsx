import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../../components/nav/navbar";
import { useAuth } from "../../context/AuthContext";

const WatchLayout = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen">
     
      <div className="flex-1">
         <Navbar
        onSearch={(q) => console.log("search:", q)}
        onSignIn={() => navigate("/login")}
        onSignOut={() => {
          signOut();
          navigate("/login");
        }}
        user={user}
      />
        <Outlet />
      </div>
    </div>
  );
};

export default WatchLayout;
