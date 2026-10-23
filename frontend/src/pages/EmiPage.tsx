import { EmiCalculator } from '../components/emi/EmiCalculator';

export function EmiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-fg">EMI calculator</h1>
        <p className="text-sm text-muted">
          Plan your loan repayment with our interactive EMI calculator and detailed amortization schedule.
        </p>
      </div>

      <EmiCalculator
        defaultPrincipal={500000}
        defaultRate={11}
        defaultTenure={60}
      />
    </div>
  );
}
