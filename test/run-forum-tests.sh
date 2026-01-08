#!/bin/bash

# Forum Tests Runner Script
# Runs all forum-related integration tests

echo "🧪 Running Forum Integration Tests..."
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if NODE_ENV is set to test
if [ "$NODE_ENV" != "test" ]; then
    echo -e "${RED}❌ ERROR: NODE_ENV must be set to 'test'${NC}"
    echo "Run: export NODE_ENV=test"
    exit 1
fi

echo -e "${YELLOW}📝 Test Environment: $NODE_ENV${NC}"
echo ""

# Run Community Sync Tests
echo -e "${YELLOW}Running Community Sync Tests...${NC}"
npm test -- test/services/classes/community-sync.test.ts
SYNC_EXIT=$?

if [ $SYNC_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Community Sync Tests Passed${NC}"
else
    echo -e "${RED}❌ Community Sync Tests Failed${NC}"
fi

echo ""
echo "===================================="

# Run Forum Classes Tests (existing)
echo -e "${YELLOW}Running Forum Classes Tests...${NC}"
npm test -- test/services/forum/forum-classes.test.ts
CLASSES_EXIT=$?

if [ $CLASSES_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Forum Classes Tests Passed${NC}"
else
    echo -e "${RED}❌ Forum Classes Tests Failed${NC}"
fi

echo ""
echo "===================================="

# Future: Add more test files here as they are created
# echo -e "${YELLOW}Running Forum Tags Tests...${NC}"
# npm test -- test/services/forum-tags/forum-tags.test.ts

# echo -e "${YELLOW}Running Forum Posts Tests...${NC}"
# npm test -- test/services/forum-posts/forum-posts.test.ts

# echo -e "${YELLOW}Running Forum Feed Tests...${NC}"
# npm test -- test/services/forum-feed/forum-feed.test.ts

# echo -e "${YELLOW}Running End-to-End Tests...${NC}"
# npm test -- test/services/forum/forum-e2e.test.ts

echo ""
echo "===================================="
echo "📊 Test Summary"
echo "===================================="

# Calculate overall result
if [ $SYNC_EXIT -eq 0 ] && [ $CLASSES_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ All Forum Tests Passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some Tests Failed${NC}"
    exit 1
fi

