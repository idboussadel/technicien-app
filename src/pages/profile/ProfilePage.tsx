import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Eye, EyeOff, User, Lock, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileFormData {
  username: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Form validation schemas
const profileSchema = z.object({
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
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire"),
    newPassword: z
      .string()
      .min(1, "Le nouveau mot de passe est obligatoire")
      .min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères")
      .max(255, "Le mot de passe ne peut pas dépasser 255 caractères"),
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est obligatoire"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export default function ProfilePage() {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user, updateUser } = useAuth();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleUpdateProfile = async (data: ProfileFormData) => {
    try {
      setIsUpdatingProfile(true);

      if (!user?.id) {
        throw new Error("Utilisateur non authentifié");
      }

      await invoke("update_user_profile", {
        profileData: {
          user_id: user.id,
          username: data.username,
          email: data.email,
        },
      });

      // Update user in context
      updateUser({
        ...user,
        username: data.username,
        email: data.email,
      });

      toast.success("Profil mis à jour avec succès!");
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : "Erreur lors de la mise à jour du profil";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (data: PasswordFormData) => {
    try {
      setIsUpdatingPassword(true);

      if (!user?.id) {
        throw new Error("Utilisateur non authentifié");
      }

      await invoke("update_user_password", {
        passwordData: {
          user_id: user.id,
          current_password: data.currentPassword,
          new_password: data.newPassword,
        },
      });

      toast.success("Mot de passe mis à jour avec succès!");
      passwordForm.reset();
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : "Erreur lors de la mise à jour du mot de passe";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profil utilisateur</h1>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles et votre mot de passe
            </p>
          </div>

          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez votre nom d'utilisateur et votre adresse email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(handleUpdateProfile)}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom d'utilisateur</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Votre nom d'utilisateur"
                            {...field}
                            disabled={isUpdatingProfile}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre.email@exemple.com"
                            {...field}
                            disabled={isUpdatingProfile}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdatingProfile} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdatingProfile ? "Mise à jour..." : "Mettre à jour le profil"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Modifier le mot de passe
              </CardTitle>
              <CardDescription>
                Changez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Votre mot de passe actuel"
                              {...field}
                              disabled={isUpdatingPassword}
                              className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoComplete="current-password"
                            />
                            <div
                              className="border-input absolute inset-y-0 right-0 flex cursor-pointer items-center border-l pr-3 pl-3"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
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
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Votre nouveau mot de passe"
                              {...field}
                              disabled={isUpdatingPassword}
                              className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoComplete="new-password"
                            />
                            <div
                              className="border-input absolute inset-y-0 right-0 flex cursor-pointer items-center border-l pr-3 pl-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
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
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirmez votre nouveau mot de passe"
                              {...field}
                              disabled={isUpdatingPassword}
                              className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoComplete="new-password"
                            />
                            <div
                              className="border-input absolute inset-y-0 right-0 flex cursor-pointer items-center border-l pr-3 pl-3"
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
                  <Button type="submit" disabled={isUpdatingPassword} className="w-full">
                    <Lock className="h-4 w-4 mr-2" />
                    {isUpdatingPassword ? "Mise à jour..." : "Changer le mot de passe"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
