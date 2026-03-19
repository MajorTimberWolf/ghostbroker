import { BrokerLayout } from "@/components/broker-layout";

export default function BrokerGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrokerLayout>{children}</BrokerLayout>;
}
