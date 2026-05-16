"""
MechFind API Server - Flask-based backend for the MechFind web application.
Provides REST API endpoints for running enzyme mechanism predictions.
"""

import json
import time
import math
import pandas as pd
import pulp
from flask import Flask, request, jsonify
from flask_cors import CORS

from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit import RDLogger

# Suppress RDKit warnings
lg = RDLogger.logger()
lg.setLevel(RDLogger.CRITICAL)

app = Flask(__name__)
CORS(app)

# ============================================================
# Helper Functions
# ============================================================

def add_dicts(dict1, dict2):
    """Combines two dictionaries by adding the values of common keys."""
    result_dict = dict1.copy()
    for key, value in dict2.items():
        result_dict[key] = result_dict.get(key, 0) + value
    return {key: value for key, value in result_dict.items() if value != 0}

def subtract_dicts(dict1, dict2):
    """Subtracts the values of one dictionary from another based on common keys."""
    result_dict = dict1.copy()
    for key, value in dict2.items():
        result_dict[key] = result_dict.get(key, 0) - value
    return {key: value for key, value in result_dict.items() if value != 0}

def reaction_string_to_moiety_change_dict(reaction_string, radius):
    """Parses a reaction SMILES string and calculates the net change in moieties."""
    initial_state_str, final_state_str = reaction_string.split(">>")
    initial_state_smiles = initial_state_str.split(".")
    final_state_smiles = final_state_str.split(".")
    
    if radius != 'MAX':
        state_i = {}
        for smile in initial_state_smiles:
            state_i = add_dicts(state_i, MolSmilesToMoietyDict(smile, radius))
        state_f = {}
        for smile in final_state_smiles:
            state_f = add_dicts(state_f, MolSmilesToMoietyDict(smile, radius))
        return subtract_dicts(state_f, state_i)
    else:
        state_i = {}
        for smile in initial_state_smiles:
            state_i = add_dicts(state_i, {smile: 1})
        state_f = {}
        for smile in final_state_smiles:
            state_f = add_dicts(state_f, {smile: 1})
        return subtract_dicts(state_f, state_i)

def MolSmilesToMoietyDict(smiles, radius):
    """Creates moiety count vector for various radii."""
    if radius != math.ceil(radius):
        mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    else:
        mol = Chem.MolFromSmiles(smiles)

    smi_count = {}
    for i in range(len([atom for atom in mol.GetAtoms()])):
        if mol.GetAtomWithIdx(i).GetAtomicNum() != 1:
            mod_mol = Chem.RWMol(mol)
            if radius != math.ceil(radius):
                for r in range(math.floor(radius), -1, -1):
                    env = Chem.FindAtomEnvironmentOfRadiusN(mod_mol, r, i, useHs=True)
                    if env:
                        break
                atoms_to_keep = set()
                atoms_to_keep.add(i)
                for bidx in env:
                    atoms_to_keep.add(mod_mol.GetBondWithIdx(bidx).GetBeginAtomIdx())
                    atoms_to_keep.add(mod_mol.GetBondWithIdx(bidx).GetEndAtomIdx())
                for j in range(mod_mol.GetNumAtoms()):
                    if j not in atoms_to_keep:
                        mod_mol.GetAtomWithIdx(j).SetAtomicNum(0)
                        mod_mol.GetAtomWithIdx(j).SetAtomMapNum(0)
                        mod_mol.GetAtomWithIdx(j).SetFormalCharge(0)
                        mod_mol.GetAtomWithIdx(j).SetNumRadicalElectrons(0)

            for r in range(math.ceil(radius), -1, -1):
                env = Chem.FindAtomEnvironmentOfRadiusN(mod_mol, r, i, useHs=True)
                if env:
                    break

            atoms = set()
            atoms.add(i)
            for bidx in env:
                atoms.add(mod_mol.GetBondWithIdx(bidx).GetBeginAtomIdx())
                atoms.add(mod_mol.GetBondWithIdx(bidx).GetEndAtomIdx())

            substructure = Chem.MolFragmentToSmiles(mod_mol, atomsToUse=list(atoms), bondsToUse=env, canonical=True, isomericSmiles=True)
            label = mod_mol.GetAtomWithIdx(i).GetAtomMapNum()
            if label != 0:
                substructure = substructure + '!'
            if substructure in smi_count:
                smi_count[substructure] += 1
            else:
                smi_count[substructure] = 1
    return smi_count

# ============================================================
# Load M-CSA Data
# ============================================================

with open('M-CSA_arrow_rules_r0.json', 'r') as f:
    MCSA_arrow_rules = json.load(f)

MCSA_mechanism_arrows = {}
for j in range(len(MCSA_arrow_rules)):
    for i in range(len(MCSA_arrow_rules[j])):
        MCSA_mechanism_arrows[str(j+1)+'_'+str(i+1)] = set()
        for s in range(len(MCSA_arrow_rules[j][i])):
            for dir in range(len(MCSA_arrow_rules[j][i][s])):
                for a in range(len(MCSA_arrow_rules[j][i][s][dir])):
                    arr = MCSA_arrow_rules[j][i][s][dir][a]
                    MCSA_mechanism_arrows[str(j+1)+'_'+str(i+1)].add(arr)

Protonation_arrow_rules = {
    'Phenol_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Phenol_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Asp/Glu_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Asp/Glu_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'HisN3_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'HisN3_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Lys_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Lys_depro': {'[OH]>>[O]', '[O]>>[H].[O]' '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Arg_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Arg_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'HisN1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'HisN1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'THFA_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'THFA_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Tys_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Formate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Formate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Ser_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Cys_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[S-]>>[H].[S-]', '[SH]>>[S]'},
    'alcohol_secondary_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    '2-Acetyllactate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Amine_secondary_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Amine_secondary_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Water_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Water_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Oxonium_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O]>>[H].[O]', '[OH+]>>[O+]'}, 'Oxonium_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O]>>[H].[O]', '[OH+]>>[O+]'},
    'Ammonium_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N]>>[H].[N]', '[NH+]>>[N+]'}, 'Ammonium_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N]>>[H].[N]', '[NH+]>>[N+]'},
    'Carboxylic_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Carboxylic_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Thiosulfate_sulfur_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[S-]>>[H].[S-]', '[SH]>>[S]'}, 'Thiosulfate_sulfur_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[S-]>>[H].[S-]', '[SH]>>[S]'},
    'Phosphate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Phosphate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Phosphate_-1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Phosphate_-1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Phosphate_-2_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Phosphate_-2_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Phosphate_-3_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Phosphate_-3_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'amine_primary_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'amine_primary_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'PLP_N_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'PLP_N_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Adenine_methylN_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH]>>[N]', '[N]>>[H].[N]', '[N]=[C]>>[N][C]'}, 'Adenine_methylN_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH]>>[N]', '[N]>>[H].[N]', '[N]=[C]>>[N][C]'},
    'Bicarbonate_-1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Bicarbonate_-1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Methylamine_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Methylamine_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    '3-Phosphonopyruvate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, '3-Phosphonopyruvate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Nitrite_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Nitrite_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'AmineC1_sugar_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'AmineC1_sugar_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'HCl_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[Cl-]>>[H].[Cl-]', '[ClH]>>[Cl]'}, 'HCl_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[Cl-]>>[H].[Cl-]', '[ClH]>>[Cl]'},
    'Methylamide_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Methylamide_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Adenine_primary_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Adenine_primary_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Arsenate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Arsenate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Cyanide_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[C-]>>[H].[C-]', '[CH]>>[C]'}, 'Cyanide_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[C-]>>[H].[C-]', '[CH]>>[C]'},
    'Sulfate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Sulfate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Sulfate_-1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Sulfate_-1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Uracil_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'}, 'Uracil_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'},
    'Sulfite_-1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Sulfite_-1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'FAD_N3_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'}, 'FAD_N3_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'},
    'EsterC1C5_sugar_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O]>>[H].[O]', '[OH+]>>[O+]'}, 'EsterC1C5_sugar_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O]>>[H].[O]', '[OH+]>>[O+]'},
    'Formyl-amine_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Formyl-amine_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Diethylamine_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Diethylamine_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'Creatine_N_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Creatine_N_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'},
    'FAD_N1_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'}, 'FAD_N1_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[N-]>>[H].[N-]', '[NH]>>[N]'},
    'Benzoate_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'}, 'Benzoate_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[O-]>>[H].[O-]', '[OH]>>[O]'},
    'Trimethylamine_depro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}, 'Trimethylamine_pro': {'[OH]>>[O]', '[O]>>[H].[O]', '[NH+]>>[N+]', '[N]>>[H].[N]'}
}

# ============================================================
# Similarity Scoring
# ============================================================

def similar_mechs(solution):
    """Calculates similarity of a candidate mechanism to known M-CSA mechanisms."""
    solution_arrows = set()
    for rule in solution:
        steps = rule.split('&')
        for step in steps:
            if 'pro' in step or 'depro' in step:
                for a in Protonation_arrow_rules.get(step, []):
                    solution_arrows.add(a)
            else:
                try:
                    if '(' in step:
                        j, i, s = step.split('(')[1].split(')')[0].split('_')
                    else:
                        j, i, s = step.split('_')
                    for arr in MCSA_arrow_rules[int(j)-1][int(i)-1][int(s)-1]:
                        solution_arrows.update(arr)
                except (ValueError, IndexError):
                    continue

    solution_scores = {}
    for m in MCSA_mechanism_arrows:
        if MCSA_mechanism_arrows[m]:
            known_arrows_set = MCSA_mechanism_arrows[m]
            intersection_size = len(solution_arrows.intersection(known_arrows_set))
            union_size = len(solution_arrows.union(known_arrows_set))
            score = intersection_size / union_size if union_size > 0 else 0.0
            solution_scores[m] = score

    return dict(sorted(solution_scores.items(), key=lambda item: item[1], reverse=True))


# ============================================================
# Main MechFind Algorithm
# ============================================================

def run_mechfind(desired_reaction, radius, max_steps, iterations, time_limit):
    """
    Run the MechFind algorithm to predict enzyme mechanisms.
    Returns a dict with solutions, mechanism matrix, and metadata.
    """
    start_time = time.time()
    
    Unique_Rules = pd.read_csv('Unique_Rules/Unique_Rules_' + str(radius) + '.csv', index_col=0)

    old_names = Unique_Rules.columns.tolist()
    new_names = list(range(len(old_names)))
    column_mapping = dict(zip(old_names, new_names))
    Unique_Rules_renamed = Unique_Rules.rename(columns=column_mapping)

    moiety_index = Unique_Rules_renamed.index.tolist()
    rules_index = Unique_Rules_renamed.columns.values.tolist()

    T = Unique_Rules_renamed.to_dict(orient="index")
    T_o = reaction_string_to_moiety_change_dict(desired_reaction, radius)
    for index in moiety_index:
        if index not in T_o:
            T_o[index] = 0.0

    C_R = MolSmilesToMoietyDict(desired_reaction.split('>>')[0], radius)

    labeled_moieties = []
    for moiety in moiety_index:
        if '!' in moiety:
            if moiety == '[O:1]!' or moiety == '*[O:1]*!' or moiety == '[H][O:1][H]!':
                labeled_moieties.append(moiety)
            else:
                if moiety in C_R.keys():
                    continue
                else:
                    labeled_moieties.append(moiety)

    for index in moiety_index:
        if index not in C_R:
            C_R[index] = 0.0

    y = pulp.LpVariable.dicts("y", rules_index, lowBound=0, cat="Integer")
    minRules = pulp.LpProblem("minRules", pulp.LpMinimize)
    minRules += pulp.lpSum([y[r] for r in rules_index])

    for m in moiety_index:
        minRules += (pulp.lpSum([T[m][r] * y[r] for r in rules_index if T[m][r] != 0]) == T_o[m],
                     "moiety_balance_" + str(moiety_index.index(m)))

    minRules += pulp.lpSum([y[r] for r in rules_index]) <= max_steps

    solutions = []
    sol_num = 0
    while len(solutions) < iterations:
        elapsed_time = time.time() - start_time
        if time_limit != 'none':
            if elapsed_time > time_limit:
                solutions.append('took too long')
                break

        try:
            remaining = time_limit - elapsed_time if time_limit != 'none' else None
            minRules.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=remaining))
        except:
            solutions.append('error in solver')

        if pulp.LpStatus[minRules.status] == 'Infeasible':
            solutions.append('infeasible')
            break
        elif pulp.LpStatus[minRules.status] == 'Not Solved':
            solutions.append('took too long')
            break

        integer_cut_rules = []
        solution = []
        for r in rules_index:
            for n in range(int(y[r].varValue)):
                integer_cut_rules.append(r)
                solution.append(r)

        sol_num += 1
        length = len(integer_cut_rules) - 1
        minRules += (pulp.lpSum([y[r] for r in integer_cut_rules]) <= length,
                     "integer_cut_" + str(sol_num),)

        K_steps = list(range(1, len(solution) + 1))
        z = pulp.LpVariable.dicts("z", (K_steps, rules_index), lowBound=0, upBound=1, cat="Binary")
        OrderRules = pulp.LpProblem("OrderRules", pulp.LpMinimize)
        OrderRules += 0

        for m in moiety_index:
            if m not in labeled_moieties:
                for current_k in K_steps:
                    OrderRules += (C_R[m] + pulp.lpSum([[T[m][r] * z[k][r] for r in set(solution) if T[m][r] != 0] for k in range(1, current_k+1)]) >= 0,
                                   "cumulative_sum_" + str(moiety_index.index(m)) + '_' + str(current_k))

        for k in K_steps:
            OrderRules += pulp.lpSum([z[k][r] for r in set(solution)]) == 1

        for r in set(solution):
            OrderRules += pulp.lpSum([z[k][r] for k in K_steps]) == int(y[r].varValue)

        OrderRules.solve(pulp.PULP_CBC_CMD(msg=0))

        if pulp.LpStatus[OrderRules.status] != 'Optimal':
            continue

        solution = []
        for k in K_steps:
            for r in rules_index:
                if z[k][r].varValue == 1:
                    solution.append(Unique_Rules.columns.tolist()[r])
        solutions.append(solution)

    # Score solutions
    scores = {}
    similarity_details = {}
    for n in range(len(solutions)):
        solution = solutions[n]
        if solution == 'took too long' or solution == 'infeasible' or solution == 'error in solver':
            scores[n] = 0.0
        else:
            mechs = similar_mechs(solution)
            scores[n] = mechs[list(mechs.keys())[0]]
            # Store top 5 similar mechanisms
            similarity_details[n] = dict(list(mechs.items())[:5])

    sorted_scores = dict(sorted(scores.items(), key=lambda item: item[1], reverse=True))
    
    sorted_solutions = []
    sorted_similarity = []
    for idx in sorted_scores:
        sorted_solutions.append(solutions[idx])
        sorted_similarity.append({
            'score': sorted_scores[idx],
            'top_matches': similarity_details.get(idx, {})
        })

    elapsed_time = time.time() - start_time

    # Build mechanism matrix for the best solution
    mechanism_matrix = None
    if sorted_solutions and sorted_solutions[0] not in ['took too long', 'infeasible', 'error in solver']:
        mechanism_matrix = build_mechanism_matrix(sorted_solutions[0], desired_reaction, radius)

    return {
        'solutions': sorted_solutions,
        'similarity': sorted_similarity,
        'mechanism_matrix': mechanism_matrix,
        'metadata': {
            'elapsed_time': round(elapsed_time, 2),
            'num_solutions': sol_num,
            'reaction': desired_reaction,
            'radius': radius,
            'max_steps': max_steps,
            'iterations': iterations,
        }
    }


def build_mechanism_matrix(mech_rules_list, desired_reaction, radius):
    """Build the mechanism matrix DataFrame for visualization."""
    reactants = desired_reaction.split('>>')[0]
    products = desired_reaction.split('>>')[1]

    reactant_moieties = {}
    for reactant in reactants.split('.'):
        reactant_moieties = add_dicts(reactant_moieties, MolSmilesToMoietyDict(reactant, radius))
    reactant_df = pd.DataFrame.from_dict(reactant_moieties, orient='index')
    reactant_df.columns = ['Reactants']

    product_moieties = {}
    for product in products.split('.'):
        product_moieties = add_dicts(product_moieties, MolSmilesToMoietyDict(product, radius))
    product_df = pd.DataFrame.from_dict(product_moieties, orient='index')
    product_df.columns = ['Products']

    true_rxn = reaction_string_to_moiety_change_dict(desired_reaction, radius)
    Mechanism = pd.DataFrame.from_dict(true_rxn, orient='index')
    Mechanism.columns = ['RXN']

    Mechanism = pd.concat([Mechanism, reactant_df], axis=1)
    Mechanism = Mechanism.fillna(0).astype(int)

    Unique_Rules = pd.read_csv('Unique_Rules/Unique_Rules_' + str(int(radius)) + '.csv', index_col=0)

    for rule in mech_rules_list:
        df = pd.DataFrame.from_dict(Unique_Rules[Unique_Rules[rule] != 0][rule].to_dict(), orient='index')
        df.columns = [rule]
        Mechanism = pd.concat([Mechanism, df], axis=1)
        Mechanism = Mechanism.fillna(0).astype(int)

    Mechanism = pd.concat([Mechanism, product_df], axis=1)
    Mechanism = Mechanism.fillna(0).astype(int)

    # Convert to dict for JSON serialization
    result = {
        'columns': ['RXN', 'Reactants'] + mech_rules_list + ['Products'],
        'index': Mechanism.index.tolist(),
        'data': Mechanism.values.tolist()
    }
    return result


# ============================================================
# API Endpoints
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'mechfind'})

@app.route('/api/predict', methods=['POST'])
def predict():
    """Run MechFind prediction."""
    try:
        data = request.get_json()
        desired_reaction = data.get('reaction', 'CC(=O)SCC.[OH2:1].[NH3+]CC>>CC(=O)NCC.SCC.[OH3+:1]')
        radius = int(data.get('radius', 1))
        max_steps = int(data.get('max_steps', 20))
        iterations = int(data.get('iterations', 10))
        time_limit = int(data.get('time_limit', 120))

        result = run_mechfind(desired_reaction, radius, max_steps, iterations, time_limit)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/examples', methods=['GET'])
def examples():
    """Return example reactions for the user to try."""
    return jsonify({
        'examples': [
            {
                'name': 'Acetyltransferase (M-CSA Example)',
                'reaction': 'CC(=O)SCC.[OH2:1].[NH3+]CC>>CC(=O)NCC.SCC.[OH3+:1]',
                'radius': 1,
                'max_steps': 20,
                'iterations': 10,
                'time_limit': 120,
                'description': 'Acetyl group transfer with protonation of water'
            },
            {
                'name': 'Simple Ester Hydrolysis',
                'reaction': 'CC(=O)OC.[OH2:1]>>CC(=O)O.CO.[OH3+:1]',
                'radius': 1,
                'max_steps': 15,
                'iterations': 5,
                'time_limit': 60,
                'description': 'Ester hydrolysis with water protonation'
            },
            {
                'name': 'Amide Formation',
                'reaction': 'CC(=O)O.[NH3+]C>>CC(=O)NC.[OH3+:1]',
                'radius': 1,
                'max_steps': 15,
                'iterations': 5,
                'time_limit': 60,
                'description': 'Amide bond formation from carboxylic acid and amine'
            }
        ]
    })


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 3002))
    app.run(host='0.0.0.0', port=port, debug=False)
