import ChatInputBox from "../../components/ui/ChatInput";

const Home = () => {
  return (
    <div className="relative min-h-screen"> 
      <h1 className="text-2xl font-bold p-4">Welcome to VideoAI</h1>


      <div className="fixed bottom-8 left-0 w-full flex justify-center px-4 z-50">
        <div className="max-w-3xl w-full">
          <ChatInputBox />
        </div>
      </div>
    </div>
  );
};

export default Home;
