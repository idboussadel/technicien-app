import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import WindowControls from "@/components/ui/window-controls";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormData {
  username: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

interface LoginPageProps {
  onLogin: (authResponse: AuthResponse) => void;
  onSwitchToRegister: () => void;
}

// Form validation schema
const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Le nom d'utilisateur est obligatoire")
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  password: z
    .string()
    .min(1, "Le mot de passe est obligatoire")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export default function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "ferme",
      password: "123456789",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);

      const authResponse = await invoke<AuthResponse>("login_user", {
        loginData: {
          username: data.username,
          password: data.password,
        },
      });

      toast.success(`Bienvenue, ${authResponse.user.username}!`);
      onLogin(authResponse);
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Erreur de connexion";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Window Controls Header */}
      <WindowControls showLogo={true} />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img src="/logo.png" className="w-[19rem]" alt="Logo" />
            </div>
            <CardDescription className="text-center">
              Connectez-vous à votre compte pour accéder à l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'utilisateur</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Votre nom d'utilisateur"
                          {...field}
                          disabled={isSubmitting}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField  
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Votre mot de passe"
                            {...field}
                            disabled={isSubmitting}
                            className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoComplete="current-password"
                          />
                          <div
                            className="border-input hover:bg-accent/50 rounded-r absolute inset-y-0 right-0 flex cursor-pointer items-center border-l pr-3 pl-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={onSwitchToRegister}
                  disabled={isSubmitting}
                >
                  Créer un compte
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
