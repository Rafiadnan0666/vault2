'use client';
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import {
  IUser,
  ITeam,
  IMember_Team,
  IRole,
  IPost,
} from "@/types/main.db";
import { createClient } from "@/utils/supabase/client";
import Layout from "@/components/Layout";

export default function TeamPage({ teamId }: { teamId: string }) {
  return (
    <Layout>
      <div>

      </div>
    </Layout>
  )
}
