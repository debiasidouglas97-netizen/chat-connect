import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/mandato_gov.png";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast.error("Confirme seu email antes de fazer login.");
      } else if (error.message.includes("Invalid login")) {
        toast.error("Email ou senha incorretos.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Login realizado!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - geometric background */}
      <div className="relative flex-1 hidden md:flex items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(152,45%,22%)] via-[hsl(152,40%,30%)] to-[hsl(150,55%,40%)]">
        {/* Geometric shapes */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-20" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <polygon points="0,0 400,100 300,400 0,300" fill="white" opacity="0.08" />
            <polygon points="200,50 700,0 600,350 250,300" fill="white" opacity="0.06" />
            <polygon points="500,100 800,0 800,400 450,350" fill="white" opacity="0.1" />
            <polygon points="0,250 350,200 400,500 100,600" fill="white" opacity="0.05" />
            <polygon points="300,300 800,200 800,600 400,600" fill="white" opacity="0.07" />
            <polygon points="0,400 200,350 300,600 0,600" fill="white" opacity="0.09" />
          </svg>
        </div>

        {/* Logo on left */}
        <div className="relative z-10 flex flex-col items-center gap-4 px-12">
          <img src={logo} alt="MandatoGov" className="w-80 drop-shadow-2xl" />
        </div>

        {/* Vertical divider */}
        <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-white/20" />
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[hsl(152,45%,18%)] to-[hsl(152,40%,25%)] px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <img src={logo} alt="MandatoGov" className="w-56" />
          </div>

          {/* User icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center">
              <User className="w-10 h-10 text-white/70" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <User className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full h-11 pl-10 pr-4 rounded-md bg-white/15 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all text-sm backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-10 rounded-md bg-white/15 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all text-sm backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/esqueci-senha")}
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-white/20 hover:bg-white/30 border border-white/25 text-white font-semibold text-sm tracking-wide uppercase transition-all disabled:opacity-50 backdrop-blur-sm"
            >
              {loading ? "Entrando..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
