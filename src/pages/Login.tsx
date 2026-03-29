import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import bgLogin from "@/assets/background_login.png";

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
      // Check if super_admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const isSuperAdmin = (roles || []).some((r: any) => r.role === "super_admin");
        navigate(isSuperAdmin ? "/admin" : "/");
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${bgLogin})` }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl p-8 space-y-6">
          {/* User avatar icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
              <User className="w-10 h-10 text-white/80" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white tracking-wide">
              Acesse sua conta
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <User className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full h-12 pl-10 pr-4 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25 focus:bg-white/15 transition-all text-sm backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full h-12 pl-10 pr-11 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25 focus:bg-white/15 transition-all text-sm backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/esqueci-senha")}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-sm tracking-widest uppercase transition-all disabled:opacity-50 backdrop-blur-sm"
            >
              {loading ? "Entrando..." : "ENTRAR"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
