
import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";

import InitialDataChoice from "./InitialDataChoice";
import useWelcomeController from "./useWelcomeController";

export default function WelcomeApp() {
  const controller = useWelcomeController();

  return (
    <SingleViewAppLayout viewKey="welcome">
      <InitialDataChoice {...controller} />
    </SingleViewAppLayout>
  );
}
