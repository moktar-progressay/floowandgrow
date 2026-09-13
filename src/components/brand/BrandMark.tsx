import { Box, Typography } from '@mui/material';

export function BrandMark() {
  return (
    <Box display="flex" alignItems="center" gap={1.25}>
      <Box
        width={16}
        height={16}
        borderRadius="50%"
        sx={{ bgcolor: 'success.main', boxShadow: '0 0 18px rgba(45,212,161,.55)' }}
      />
      <Typography variant="h5" fontWeight={800} letterSpacing={-0.7}>
        Focus<Box component="span" color="primary.main">OS</Box>
      </Typography>
    </Box>
  );
}
