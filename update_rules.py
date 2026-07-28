with open('firestore.rules', 'r') as f:
    content = f.read()

rule_to_add = '''
    match /nursery_stock_out/{docId} {
      allow read: if isVerifiedUser();
      allow create, update: if isOperator() || isVerifiedUser();
      allow delete: if isAdmin() || isSuperintendent();
    }
'''

content = content.replace('match /nursery/{docId} {', rule_to_add + '\n    match /nursery/{docId} {')

with open('firestore.rules', 'w') as f:
    f.write(content)
