import { HomeDashboard } from "@/components/domain/home-dashboard";
import { catalog } from "@/lib/data";

export default function HomePage() {
  return <HomeDashboard items={catalog} />;
}
