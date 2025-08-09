import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Eye, EyeOff, UserPlus, Key } from "lucide-react";

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  registrationCode: string;
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

interface RegisterPageProps {
  onRegister: (authResponse: AuthResponse) => void;
  onSwitchToLogin: () => void;
}

// Form validation schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, "Le nom d'utilisateur est obligatoire")
      .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
      .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores"
      ),
    email: z
      .string()
      .min(1, "L'email est obligatoire")
      .email("L'email doit être valide")
      .max(255, "L'email ne peut pas dépasser 255 caractères"),
    password: z
      .string()
      .min(1, "Le mot de passe est obligatoire")
      .min(6, "Le mot de passe doit contenir au moins 6 caractères")
      .max(255, "Le mot de passe ne peut pas dépasser 255 caractères"),
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est obligatoire"),
    registrationCode: z.string().min(1, "Le code d'enregistrement est obligatoire"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export default function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      registrationCode: "",
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);

      const authResponse = await invoke<AuthResponse>("register_user", {
        userData: {
          username: data.username,
          email: data.email,
          password: data.password,
          registration_code: data.registrationCode,
        },
      });

      toast.success(`Compte créé avec succès! Bienvenue, ${authResponse.user.username}!`);
      onRegister(authResponse);
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : "Erreur lors de la création du compte";
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
              <UserPlus className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
            <CardDescription className="text-center">
              Créez votre compte pour accéder à l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="votre.email@exemple.com"
                          {...field}
                          disabled={isSubmitting}
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
                            autoComplete="new-password"
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
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmez votre mot de passe"
                            {...field}
                            disabled={isSubmitting}
                            className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoComplete="new-password"
                          />
                          <div
                            className="border-input hover:bg-accent/50 rounded-r absolute inset-y-0 right-0 flex cursor-pointer items-center border-l pr-3 pl-3"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
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
                <FormField
                  control={form.control}
                  name="registrationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Code d'enregistrement
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Code secret requis"
                          {...field}
                          disabled={isSubmitting}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Création du compte..." : "Créer le compte"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={onSwitchToLogin}
                  disabled={isSubmitting}
                >
                  Se connecter
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
