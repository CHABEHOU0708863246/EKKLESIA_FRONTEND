// src/app/core/models/propertys/property-summary.model.ts
import { Property, PropertyStatus, PropertyType } from './property.model';
import { Contract, ContractStatus, ContractType } from './contract.model';

export interface PropertySummary {
  // Biens
  totalProperties: number;
  activeProperties: number;
  inactiveProperties: number;
  propertiesByType: Record<PropertyType, number>;
  propertiesByStatus: Record<PropertyStatus, number>;
  totalAcquisitionValue: number;
  totalCurrentValue: number;
  totalArea: number;

  // Contrats
  totalContracts: number;
  activeContracts: number;
  expiringSoonContracts: number;
  expiredContracts: number;
  contractsByType: Record<ContractType, number>;
  contractsByStatus: Record<ContractStatus, number>;
  totalContractAmount: number;
  totalDepositAmount: number;

  // Listes
  recentProperties: Property[];
  expiringContracts: Contract[];
  recentContracts: Contract[];
}
