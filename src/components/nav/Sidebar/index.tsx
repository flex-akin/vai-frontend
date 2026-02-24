import { BadgePlus, PanelLeft, PanelRight, TvMinimalPlay } from "lucide-react";
import React from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";

const SideBar = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div style={{ display: "flex", height: "100%", minHeight: "100vh" }}>
      <Sidebar
        collapsed={collapsed}
        width="260px"
        collapsedWidth="60px"
        backgroundColor="#181818"
        rootStyles={{
          borderRight: "none",
        }}
      >
        <Menu>
          <div className="flex justify-between m-3">
            {!collapsed && (
              <div>
                <TvMinimalPlay strokeWidth={1.5} size={20} />
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? (
                <div className="mx-6">
                  <PanelRight strokeWidth={1} size={19} />
                </div>
              ) : (
                <PanelLeft strokeWidth={1} size={19} />
              )}
            </button>
          </div>
          <MenuItem icon={<BadgePlus />}> New chat</MenuItem>
        </Menu>
      </Sidebar>
      <main style={{ padding: 12 }}></main>
    </div>
  );
};

export default SideBar;
