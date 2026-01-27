import Layout from "@/components/layout/Layout";
import { ProviderComparisonTool } from "@/components/providers/ProviderComparisonTool";

const Compare = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <ProviderComparisonTool />
      </div>
    </Layout>
  );
};

export default Compare;
