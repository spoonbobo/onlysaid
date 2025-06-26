"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Button, VStack, Checkbox, Text, Stack } from "@chakra-ui/react";
import { SignupErrors, type SignupForm } from "@/types/signup";
import { useRouter } from "next/navigation";
import { toaster } from "@/components/ui/toaster";

export default function SignupForm() {
  const t = useTranslations("Signup");
  const router = useRouter();
  const [formData, setFormData] = useState<SignupForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Partial<SignupErrors>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    if (errors[name as keyof SignupForm]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validate = (formData: SignupForm) => {
      console.log("formData", formData);
      const e: Partial<SignupErrors> = {};
      if (!formData.username.trim()) {
        e.username = t("username_required");
      }
      if (!formData.email.trim()) {
        e.email = t("email_required");
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        e.email = t("email_invalid");
      }
      if (!formData.password) {
        e.password = t("password_required");
      } else if (formData.password.length < 8) {
        e.password = t("password_must_be_at_least_8_characters");
      }
      if (formData.password !== formData.confirmPassword) {
        e.confirmPassword = t("passwords_do_not_match");
      }
      if (!formData.agreeToTerms) {
        e.agreeToTerms = t("agree_to_terms");
      }
      return e;
    };

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Replace with your actual signup API call
      // await signupUser(formData);
      console.log("Form submitted:", formData);

      // Redirect to success page or dashboard after successful signup
      router.push("/");
    } catch (error) {
      toaster.create({
        title: "Error signing up",
        description: "Failed to sign up. Please try again later.",
        type: "error"
      })
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch">
        <Stack>
          <label>{t("username")}</label>
          <Input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder={t("username_placeholder")}
            _invalid={errors.username ? { borderColor: "red.500" } : undefined}
          />
          {errors.username && (
            <Text color="red.500" fontSize="sm">
              {errors.username}
            </Text>
          )}
        </Stack>

        <Stack>
          <label>{t("email")}</label>
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("email_placeholder")}
          // isInvalid={!!errors.email}
          />
          {errors.email && (
            <Text color="red.500" fontSize="sm">
              {errors.email}
            </Text>
          )}
        </Stack>

        <Stack>
          <label>{t("password")}</label>
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            placeholder={t("password_placeholder")}
          //   isInvalid={!!errors.password}
          />
          {/* <InputElement placement="end" width="4.5rem">
            <Button
              h="1.75rem"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </InputElement> */}
          {errors.password && (
            <Text color="red.500" fontSize="sm">
              {errors.password}
            </Text>
          )}
        </Stack>

        <Stack>
          <label>{t("confirm_password")}</label>
          <Input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder={t("confirm_password_placeholder")}
            // isInvalid={!!errors.confirmPassword}
            _invalid={
              errors.confirmPassword ? { borderColor: "red.500" } : undefined
            }
          />
          {errors.confirmPassword && (
            <Text color="red.500" fontSize="sm">
              {errors.confirmPassword}
            </Text>
          )}
        </Stack>

        <Stack>
          <Checkbox.Root
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => {
              setFormData({
                ...formData,
                // @ts-ignore
                agreeToTerms: checked.checked,
              });

              // Clear error when field is edited
              if (errors.agreeToTerms) {
                setErrors({
                  ...errors,
                  agreeToTerms: undefined,
                });
              }
            }}
          >
            <Checkbox.HiddenInput name="agreeToTerms" />
            <Checkbox.Control />
            <Checkbox.Label>{t("agree_to_terms")}</Checkbox.Label>
          </Checkbox.Root>
          {errors.agreeToTerms && (
            <Text color="red.500" fontSize="sm">
              {errors.agreeToTerms}
            </Text>
          )}
        </Stack>

        <Button
          mt={4}
          colorScheme="blue"
          loading={isSubmitting}
          type="submit"
          width="full"
        >
          {t("create_account")}
        </Button>
      </VStack>
    </form>
  );
}
