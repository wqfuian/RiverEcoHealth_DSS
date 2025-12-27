import numpy as np

def calculate_weights(matrix):
    """
    Calculate weights using the eigenvector method for AHP.
    :param matrix: square comparison matrix (numpy array)
    :return: weights array, consistency ratio (CR)
    """
    n = matrix.shape[0]
    # Calculate eigenvalues and eigenvectors
    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    
    # Get the index of the maximum eigenvalue (lambda_max)
    max_eigenvalue_idx = np.argmax(np.real(eigenvalues))
    lambda_max = np.real(eigenvalues[max_eigenvalue_idx])
    
    # Corresponding eigenvector
    weights = np.real(eigenvectors[:, max_eigenvalue_idx])
    weights = weights / np.sum(weights)  # Normalize
    
    # Consistency Index (CI)
    ci = (lambda_max - n) / (n - 1)
    
    # Random Consistency Index (RI) for n=1 to 10
    ri_table = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
    ri = ri_table.get(n, 1.49)
    
    cr = ci / ri if ri != 0 else 0
    return weights, cr

def fuzzy_evaluation(weights, relation_matrix):
    """
    Perform Fuzzy Comprehensive Evaluation (FCE).
    :param weights: weight vector for indicators
    :param relation_matrix: membership matrix (m x n, m=indicators, n=grades)
    :return: result vector (1 x n)
    """
    # Matrix multiplication: B = W * R
    result = np.dot(weights, relation_matrix)
    return result
